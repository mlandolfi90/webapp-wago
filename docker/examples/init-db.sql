-- Script de inicialização dos bancos de dados WebAPP-Wago

-- Criar database para autenticação
CREATE DATABASE webappwago_auth;

-- Criar database para dados de usuários
CREATE DATABASE webappwago_users;

-- Mensagem de confirmação
SELECT 'Databases webappwago_auth e webappwago_users criados com sucesso!' as message;
