# AL3R0I.ezk

Chat de IA com personalidade arrogante, sarcástica, provocadora e direta, em português brasileiro.

## Estrutura

- `index.html`: interface do chat.
- `style.css`: layout responsivo, com tema escuro.
- `script.js`: mensagens, histórico local e chamadas à API.
- `api/chat.js`: endpoint server-side que consulta a API do Gemini.

## Configurar a IA

1. Crie uma chave de API no Google AI Studio: https://aistudio.google.com/apikey
2. Publique este repositório na Vercel: https://vercel.com/new
3. Nas configurações do projeto na Vercel, abra **Settings → Environment Variables**.
4. Adicione `GEMINI_API_KEY` com sua chave secreta.
5. Opcionalmente, adicione `GEMINI_MODEL` com `gemini-2.5-flash`.
6. Faça um novo deploy e abra o site publicado.

**Segurança:** nunca coloque a chave real no `script.js`, no HTML, em commits ou em arquivos públicos. Use somente a variável de ambiente do servidor. Se uma chave já tiver sido publicada, revogue-a e crie outra.

## Desenvolvimento local

Requer Node.js e a CLI da Vercel:

```bash
npm install -g vercel
vercel dev
```

Configure as variáveis localmente em um arquivo `.env` que não deve ser enviado ao GitHub.

## Estado atual

A primeira versão da interface e do endpoint foi criada na branch `feat/al3r0i-system`. A chave do Gemini ainda precisa ser adicionada na hospedagem para habilitar respostas reais. O histórico do chat é guardado no armazenamento local do navegador; evite usar dados sensíveis.
