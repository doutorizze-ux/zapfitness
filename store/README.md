# Publicação do ZappFitness na Microsoft Store

O cliente web já está preparado como PWA em `/manifest.webmanifest`, com ícones em `client/public/icons` e service worker em `client/public/sw.js`.

## Próxima etapa no Windows

1. Publicar o commit em `https://www.zapp.fitness`.
2. Validar a instalação pelo Microsoft Edge e pelo Lighthouse/PWA Builder.
3. Gerar o pacote Windows como **MSIX** a partir da URL pública do PWA.
4. Criar ou reservar o nome do aplicativo no Partner Center.
5. Enviar o MSIX, descrição, política de privacidade, logo e capturas de tela.

O aplicativo continuará usando o backend online do Coolify. O pacote desktop será a experiência instalada do mesmo sistema, sem duplicar regras de negócio ou criar uma segunda base de dados.
