# Guia Passo a Passo: Instalar e Rodar Docker Localmente

Este guia cobra desde instalação do Docker até executar o sistema localmente em um contêiner.

## 1. Pré-requisitos
- Sistema operacional: Windows 10/11 (64-bit)
- 4 GB+ de RAM (recomendado 8 GB+)
- Virtualização habilitada na BIOS/UEFI (Hyper-V/WSL2)

## 2. Baixar Docker Desktop
1. Acesse https://www.docker.com/products/docker-desktop
2. Clique em “Download for Windows (Windows 10/11)”.
3. Abra o arquivo `.exe` baixado.

## 3. Instalar Docker Desktop (Windows)
1. Execute o instalador como Administrador.
2. Marque a opção `Use WSL 2 instead of Hyper-V` se disponível.
3. Marque a opção `Enable Hyper-V` se estiver disponível e necessário.
4. Clique em `Install`.
5. Aguarde a instalação e reinicie o PC se solicitado.

## 4. Configurar WSL2 (se não estiver configurado)
1. Abra o PowerShell como Administrador.
2. Execute:
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```
3. Instale uma distro (Ubuntu recomendado) via Microsoft Store.
4. Abra a distro e finalize configuração de usuário/senha.

## 5. Verificar instalação do Docker
1. Abra o terminal (CMD/PowerShell) e execute:
   ```powershell
   docker version
   docker info
   docker run hello-world
   ```
2. Confirme que não há erros e que o contêiner `hello-world` foi executado com sucesso.

## 6. Preparar o projeto para Docker
No repositório `Or-amento_v2.1.0` já existe `Dockerfile`, `docker-compose.yml` e configuração pronta.

1. Abra um terminal na raiz do projeto:
   ```powershell
   cd E:\Program_file\Or-amento_v2.1.0
   ```
2. Verifique se o `docker-compose.yml` está configurado corretamente.

## 7. Rodar o projeto com Docker Compose
1. Executar:
   ```powershell
   docker-compose up --build
   ```
2. Aguarde até ver o log de serviços rodando.
3. Acesse em:
   - Frontend: `http://localhost:3001` (ou porta configurada)
   - Backend: `http://localhost:3002` (ou porta configurada)

## 8. Verificar funcionamento no navegador
1. Abra `http://localhost:3001`
2. Faça login com:
   - Email: `admin@admin.com`
   - Senha: `admin`

## 9. Parar o Docker
1. No terminal:
   ```powershell
   docker-compose down
   ```
2. Ou via Docker Desktop: clique em `Stop` no serviço.

## 10. Dicas de resolução de problemas
- Se `docker-compose up` retornar erro de porta em uso, altere portas no `docker-compose.yml` ou em outro serviço.
- Se falhar ao iniciar serviços, revise logs e rode:
  ```powershell
  docker-compose logs --tail=50
  ```
- Em caso de erro de `db`, garanta que a imagem do banco (MySQL/Postgres) está criada e o container em estado `running`.

## 11. Comandos úteis
- `docker ps` (ver containers rodando)
- `docker images` (ver imagens existentes)
- `docker system prune -af` (limpar recursos não usados)

---

Você está pronto para rodar o sistema localmente no Docker. Se precisar, posso gerar a versão em formato `.bat` com esses comandos prontos.