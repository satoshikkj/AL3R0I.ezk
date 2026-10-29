# WebGuard Scanner V1

Painel responsivo em HTML, CSS e JavaScript puro, sem dependências ou chaves de API.

## Abrir
Abra `index.html` localmente. O projeto está nesta pasta para preservar os arquivos existentes de AL3R0I.ezk.

## Limites desta versão
**Não é um scanner real.** O botão simula o fluxo da interface; os achados, severidades e score são fictícios. Nenhuma requisição é enviada ao domínio informado.

## Próximas etapas
1. Criar backend separado para verificações passivas reais de HTTPS, cabeçalhos e cookies.
2. Validar autorização e escopo antes de executar análise.
3. Proteger contra SSRF: bloquear loopback, redes privadas, link-local, DNS rebinding e redirecionamentos para destinos internos.
4. Definir timeouts, limites de tamanho, concorrência, portas e taxa de requisições.
5. Integrar OWASP ZAP em um ambiente de teste autorizado.
6. Distinguir achados observados, inferidos e não testados; nunca inventar evidências.

## Publicação
Pode ser hospedado como site estático. Para servir a pasta em GitHub Pages, verifique se Pages está habilitado para o repositório e use o caminho `/webguard-scanner/` caso a raiz do repositório seja publicada.
