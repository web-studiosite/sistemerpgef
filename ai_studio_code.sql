-- ============================================================================
-- GEF GESTÃO FINANCEIRA ERP - BANCO DE DADOS SUPABASE (POSTGRESQL 15+)
-- Sistema Comercial para Lojas de Materiais de Construção, Ferragens e PDV
-- ============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUMS / TIPOS CUSTOMIZADOS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'ADMIN', 'GERENTE', 'CASHIER', 'ESTOQUISTA', 'EMBAIXADOR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('DINHEIRO', 'MPESA', 'EMOLA', 'CONTO_MOVEL', 'CARTAO_POS', 'TRANSFERENCIA', 'FIADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE cash_session_status AS ENUM ('OPEN', 'CLOSED', 'AUDITED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('ENTRADA', 'SAIDA', 'VENDA', 'SANGRIA', 'SUPRIMENTO', 'PERDA', 'TRANSFERENCIA', 'AJUSTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE batch_status AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('PENDENTE', 'EM_SEPARACAO', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 3. TABELA DE LOJAS (MULTI-TENANCY & LICENCIAMENTO SAAS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY DEFAULT ('store-' || substr(md5(random()::text), 1, 8)),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    nuit VARCHAR(30),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Maputo',
    province VARCHAR(100) DEFAULT 'Maputo Cidade',
    currency VARCHAR(10) DEFAULT 'MT',
    is_headquarters BOOLEAN DEFAULT false,
    manager_name VARCHAR(150),
    receipt_header TEXT,
    receipt_footer TEXT,
    receipt_printer_width VARCHAR(20) DEFAULT '80mm',
    active BOOLEAN DEFAULT true,
    acesso_ativo BOOLEAN DEFAULT true, -- Trava SaaS LRS
    data_fim_teste DATE,
    dias_teste_padrao INT DEFAULT 14,
    mensalidade NUMERIC(12, 2) DEFAULT 4500.00,
    ambassador_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. PROGRAMA DE EMBAIXADORES PARCEIROS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ambassadors (
    id TEXT PRIMARY KEY DEFAULT ('EMB-' || floor(random() * 900 + 100)::text),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    commission_percent NUMERIC(5, 2) DEFAULT 15.00,
    payment_channel VARCHAR(50) DEFAULT 'M-Pesa',
    payment_account VARCHAR(100),
    total_commission_earned NUMERIC(12, 2) DEFAULT 0.00,
    total_commission_paid NUMERIC(12, 2) DEFAULT 0.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de Pagamentos aos Embaixadores (Feitos pelo Superadmin)
CREATE TABLE IF NOT EXISTS public.ambassador_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id TEXT NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) DEFAULT 'M-Pesa',
    receipt_ref VARCHAR(100),
    notes TEXT,
    paid_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PERFIS DE USUÁRIOS (INTEGRADO AO SUPABASE AUTH)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CASHIER',
    store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
    ambassador_id TEXT REFERENCES public.ambassadors(id) ON DELETE SET NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. UNIDADES DE MEDIDA E FORNECEDORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.units (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    allows_fractionation BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY DEFAULT ('supp-' || substr(md5(random()::text), 1, 6)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    nuit VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. CLIENTES E GESTÃO DE CRÉDITO (FIADO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT ('cust-' || substr(md5(random()::text), 1, 6)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nuit VARCHAR(50),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    current_debt NUMERIC(12, 2) DEFAULT 0.00,
    allow_credit BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extrato de Movimentações de Conta Corrente / Fiado do Cliente
CREATE TABLE IF NOT EXISTS public.customer_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sale_id TEXT,
    type VARCHAR(20) NOT NULL, -- 'DEBITO_COMPRA', 'PAGAMENTO_RECEBIDO', 'AJUSTE'
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    registered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. PRODUTOS, EMBALAGENS E MATRIZ FEFO (LOTES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT ('prod-' || substr(md5(random()::text), 1, 6)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    base_unit VARCHAR(20) NOT NULL REFERENCES public.units(id),
    min_stock_alert NUMERIC(12, 3) DEFAULT 10.000,
    current_stock_base NUMERIC(12, 3) DEFAULT 0.000,
    cost_price_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sale_price_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allows_fractionation BOOLEAN DEFAULT false,
    stock_loja NUMERIC(12, 3) DEFAULT 0.000,
    stock_armazem NUMERIC(12, 3) DEFAULT 0.000,
    stock_patio NUMERIC(12, 3) DEFAULT 0.000,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_product_store_code UNIQUE(store_id, code)
);

-- Embalagens e Fatores de Conversão (Ex: Palete c/ 40 Sacos, Caixa c/ 100 Parafusos)
CREATE TABLE IF NOT EXISTS public.product_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    packaging_name VARCHAR(100) NOT NULL,
    multiplier NUMERIC(12, 3) NOT NULL CHECK (multiplier > 0),
    sale_price NUMERIC(12, 2) NOT NULL,
    barcode VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lotes para Gestão FEFO (First Expire, First Out)
CREATE TABLE IF NOT EXISTS public.product_batches (
    id TEXT PRIMARY KEY DEFAULT ('batch-' || substr(md5(random()::text), 1, 8)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    initial_quantity_base NUMERIC(12, 3) NOT NULL,
    current_quantity_base NUMERIC(12, 3) NOT NULL,
    cost_per_base NUMERIC(12, 2) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    status batch_status DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kardex de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id TEXT REFERENCES public.product_batches(id) ON DELETE SET NULL,
    type movement_type NOT NULL,
    quantity_base NUMERIC(12, 3) NOT NULL,
    stock_before NUMERIC(12, 3) NOT NULL,
    stock_after NUMERIC(12, 3) NOT NULL,
    reference_id TEXT, -- ID da Venda, Perda ou Transferência
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perdas e Quebras (Cimento empedrado, tubos quebrados, ferro oxidado)
CREATE TABLE IF NOT EXISTS public.losses (
    id TEXT PRIMARY KEY DEFAULT ('loss-' || substr(md5(random()::text), 1, 6)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id TEXT REFERENCES public.product_batches(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    cost_amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    reported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. FRENTE DE CAIXA (PDV), SESSÕES E FECHAMENTO CEGO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id TEXT PRIMARY KEY DEFAULT ('caixa-' || substr(md5(random()::text), 1, 4)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_register_store_code UNIQUE(store_id, code)
);

CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id TEXT PRIMARY KEY DEFAULT ('sess-' || substr(md5(random()::text), 1, 8)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    register_id TEXT NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES auth.users(id),
    initial_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(12, 2) DEFAULT 0.00,
    reported_cash NUMERIC(12, 2), -- Valor inserido no Fechamento Cego
    difference NUMERIC(12, 2),    -- Quebra ou Sobra de caixa calculada
    notes TEXT,
    status cash_session_status DEFAULT 'OPEN',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'SANGRIA', 'SUPRIMENTO'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    authorized_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. VENDAS, ITENS COM CMV (COGS) E FEFO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY DEFAULT ('sale-' || floor(extract(epoch from now()))::text || '-' || floor(random() * 9000 + 1000)::text),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) DEFAULT 'Consumidor Final (Balcão)',
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_net NUMERIC(12, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'DINHEIRO',
    amount_paid NUMERIC(12, 2) NOT NULL,
    change_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_cogs NUMERIC(12, 2) DEFAULT 0.00, -- Custo da Mercadoria Vendida
    gross_margin NUMERIC(12, 2) DEFAULT 0.00,
    has_delivery BOOLEAN DEFAULT false,
    operator_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'COMPLETED', -- 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_code VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    batch_id TEXT REFERENCES public.product_batches(id) ON DELETE SET NULL,
    batch_number VARCHAR(100),
    packaging_name VARCHAR(100),
    multiplier_to_base NUMERIC(12, 3) DEFAULT 1.000,
    quantity NUMERIC(12, 3) NOT NULL,
    quantity_base NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    unit_cogs NUMERIC(12, 2) DEFAULT 0.00,
    total_cogs NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. ORÇAMENTOS E ENTREGAS EM CANTEIRO DE OBRA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id TEXT PRIMARY KEY DEFAULT ('orc-' || floor(extract(epoch from now()))::text),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    valid_until DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_net NUMERIC(12, 2) NOT NULL,
    status quote_status DEFAULT 'PENDING',
    converted_sale_id TEXT REFERENCES public.sales(id),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    packaging_name VARCHAR(100),
    multiplier NUMERIC(12, 3) DEFAULT 1.000,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY DEFAULT ('ent-' || substr(md5(random()::text), 1, 6)),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sale_id TEXT REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    delivery_address TEXT NOT NULL,
    construction_site_ref VARCHAR(255),
    scheduled_date DATE NOT NULL,
    driver_name VARCHAR(150),
    vehicle_plate VARCHAR(50),
    notes TEXT,
    status delivery_status DEFAULT 'PENDENTE',
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. AUDITORIA IMUTÁVEL (AUDIT LOGS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. ÍNDICES DE ALTA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_store_barcode ON public.products(store_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_store_code ON public.products(store_id, code);
CREATE INDEX IF NOT EXISTS idx_batches_fefo ON public.product_batches(store_id, product_id, expiry_date ASC) WHERE current_quantity_base > 0;
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_session ON public.sales(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_open ON public.cash_sessions(store_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON public.stock_movements(store_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_schedule ON public.deliveries(store_id, scheduled_date, status);

-- ============================================================================
-- 14. TRIGGER AUTOMÁTICO: ATUALIZAR TIMESTAMP DE MODIFICAÇÃO (updated_at)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_ambassadors_updated_at BEFORE UPDATE ON public.ambassadors FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 15. SINCRONIZAÇÃO AUTOMÁTICA AUTH.USERS -> PUBLIC.PROFILES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, store_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CASHIER'::user_role),
        COALESCE(NEW.raw_user_meta_data->>'store_id', 'store-001')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 16. SEGURANÇA POR LINHA (ROW LEVEL SECURITY - RLS)
-- ============================================================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Funções utilitárias de verificação de permissão
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SUPERADMIN' AND active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_user_store_id()
RETURNS TEXT AS $$
    SELECT store_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- POLÍTICAS: LOJAS
CREATE POLICY "Superadmin tem acesso global as lojas" ON public.stores
    FOR ALL TO authenticated USING (public.is_superadmin());

CREATE POLICY "Usuários podem ver a própria loja" ON public.stores
    FOR SELECT TO authenticated USING (id = public.current_user_store_id());

-- POLÍTICAS: PRODUTOS & ESTOQUE
CREATE POLICY "Superadmin tem acesso irrestrito aos produtos" ON public.products
    FOR ALL TO authenticated USING (public.is_superadmin());

CREATE POLICY "Usuários operam apenas produtos da própria loja" ON public.products
    FOR ALL TO authenticated
    USING (store_id = public.current_user_store_id())
    WITH CHECK (store_id = public.current_user_store_id());

-- POLÍTICAS: VENDAS
CREATE POLICY "Superadmin gerencia todas as vendas" ON public.sales
    FOR ALL TO authenticated USING (public.is_superadmin());

CREATE POLICY "Operadores e gerentes acessam vendas da sua loja" ON public.sales
    FOR ALL TO authenticated
    USING (store_id = public.current_user_store_id())
    WITH CHECK (store_id = public.current_user_store_id());

-- POLÍTICAS: EMBAIXADORES
CREATE POLICY "Superadmin tem controle total sobre embaixadores" ON public.ambassadors
    FOR ALL TO authenticated USING (public.is_superadmin());

CREATE POLICY "Embaixador visualiza apenas sua propria conta" ON public.ambassadors
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR id = (SELECT ambassador_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Apenas Superadmin cria pagamentos de embaixadores" ON public.ambassador_payouts
    FOR ALL TO authenticated USING (public.is_superadmin());

-- ============================================================================
-- 17. CARGA DE DADOS INICIAIS (SEEDS OBRIGATÓRIOS)
-- ============================================================================

-- Unidades de Medida Usuais na Construção Civil
INSERT INTO public.units (id, name, symbol, allows_fractionation) VALUES
('sc', 'Saco', 'sc', false),
('bar', 'Barra de 12 Metros', 'bar', false),
('kg', 'Quilograma', 'kg', true),
('m3', 'Metro Cúbico (Areia/Pedra)', 'm³', true),
('un', 'Unidade', 'un', false),
('l', 'Litro', 'L', true),
('cx', 'Caixa', 'cx', false)
ON CONFLICT (id) DO NOTHING;

-- Lojas de Demonstração
INSERT INTO public.stores (id, code, name, trade_name, nuit, phone, email, address, city, is_headquarters, mensalidade, acesso_ativo) VALUES
('store-001', 'LOJA-01', 'GEF - Ferragens & Materiais de Construção', 'GEF Ferragens Matriz', '400192834', '+258 84 399 2200', 'contato@gef.co.mz', 'Av. das FPLM, nº 2500, Maputo Central', 'Maputo', true, 4500.00, true),
('store-002', 'LOJA-02', 'GEF Ferragens – Filial Matola Rio', 'GEF Matola', '400192834-02', '+258 84 555 3300', 'matola@gef.co.mz', 'EN4 Km 12, Matola Rio', 'Matola', false, 3500.00, true)
ON CONFLICT (id) DO NOTHING;

-- Embaixadores Parceiros
INSERT INTO public.ambassadors (id, name, phone, email, code, commission_percent, payment_channel, payment_account, total_commission_earned, total_commission_paid, current_balance, active) VALUES
('EMB-842', 'Mateus Chissano (Embaixador Maputo)', '+258 84 333 1122', 'mateus.chissano@gefparceiros.co.mz', 'EMB-842', 15.00, 'M-Pesa', '843331122', 13500.00, 4500.00, 9000.00, true),
('EMB-310', 'Joana Cossa (Embaixadora Beira)', '+258 84 555 9988', 'joana.cossa@gefparceiros.co.mz', 'EMB-310', 15.00, 'M-Pesa', '845559988', 5250.00, 5250.00, 0.00, true),
('EMB-501', 'Abdul Cadre (Embaixador Nampula)', '+258 86 222 4433', 'abdul.cadre@gefparceiros.co.mz', 'EMB-501', 15.00, 'M-Pesa', '862224433', 7875.00, 0.00, 7875.00, true)
ON CONFLICT (id) DO NOTHING;

-- Caixas PDV
INSERT INTO public.cash_registers (id, store_id, code, name, active) VALUES
('cx-01-matriz', 'store-001', 'PDV-01', 'Caixa Principal Balcão 1', true),
('cx-02-matriz', 'store-001', 'PDV-02', 'Caixa Rápido Balcão 2', true),
('cx-01-matola', 'store-002', 'PDV-01', 'Caixa Geral Matola', true)
ON CONFLICT (id) DO NOTHING;

-- Produtos de Demonstração (Materiais de Construção)
INSERT INTO public.products (id, store_id, code, barcode, name, category, base_unit, min_stock_alert, current_stock_base, cost_price_base, sale_price_base, allows_fractionation, stock_loja, stock_armazem, active) VALUES
('prod-001', 'store-001', 'CIM-425', '6001010101011', 'Cimento Portland 42.5N (Saco 50kg)', 'Cimentos & Argamassas', 'sc', 100.000, 650.000, 420.00, 510.00, false, 150.000, 500.000, true),
('prod-002', 'store-001', 'ACO-10MM', '6002020202022', 'Varão de Aço Nervurado 10mm (Barra 12m)', 'Ferro & Aço Estrutural', 'bar', 80.000, 420.000, 480.00, 590.00, false, 70.000, 350.000, true),
('prod-003', 'store-001', 'AREIA-LAV', '6003030303033', 'Areia Grossa Lavada de Rio (Metro Cúbico)', 'Inertes & Agregados', 'm3', 20.000, 85.000, 750.00, 1100.00, true, 10.000, 75.000, true)
ON CONFLICT (id) DO NOTHING;

-- Lotes Iniciais para FEFO
INSERT INTO public.product_batches (id, store_id, product_id, batch_number, initial_quantity_base, current_quantity_base, cost_per_base, expiry_date, status) VALUES
('batch-001-a', 'store-001', 'prod-001', 'LT-CIM-2601', 700.000, 650.000, 420.00, '2026-11-20', 'ACTIVE'),
('batch-002-a', 'store-001', 'prod-002', 'LT-ACO-2602', 450.000, 420.000, 480.00, '2029-12-31', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;