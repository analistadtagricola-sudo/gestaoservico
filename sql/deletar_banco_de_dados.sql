-- =======================================================
-- deletar banco de dados.sql
-- ATENÇÃO: Executar este script irá APAGAR TODAS AS TABELAS e dados!
-- =======================================================

DROP TABLE IF EXISTS os_pecas CASCADE;
DROP TABLE IF EXISTS pecas CASCADE;
DROP TABLE IF EXISTS os_apontamentos CASCADE;
DROP TABLE IF EXISTS ordens_servico CASCADE;
DROP TABLE IF EXISTS revisoes_plano CASCADE;
DROP TABLE IF EXISTS planos_manutencao CASCADE;
DROP TABLE IF EXISTS implementos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS tecnicos CASCADE;
DROP TABLE IF EXISTS veiculos CASCADE;
DROP TABLE IF EXISTS tipos_atendimento CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
