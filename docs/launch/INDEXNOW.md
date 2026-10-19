# IndexNow — Street Goose 034

## Objetivo
Comunicar alteracoes reais de paginas publicas da Street Goose 034 aos mecanismos de busca participantes do protocolo IndexNow. Recebimento nao garante indexacao nem melhoria de ranking. Google Search Console continua independente.

## Implementacao
- Chave de propriedade: `public/989f03f4d0umc4d1eb85921719848c87c.txt`, publicada na raiz do dominio.
- URL da chave: `https://www.streetgoose034.com.br/989f03f4d0umc4d1eb85921719848c87c.txt`.
- Script Node: `scripts/indexnow-notify.mjs`.
- Workflow: `.github/workflows/indexnow.yml`.
- Origem das URLs: `https://www.streetgoose034.com.br/sitemap.xml`.
- Somente `https://www.streetgoose034.com.br/` e URLs publicas presentes no sitemap sao consideradas.
- O script espera ate que a chave esteja acessivel no dominio principal, valida o host e so entao envia um POST em lote para `https://api.indexnow.org/indexnow`.
- Respostas 200/202 significam recebimento (202 pode ser validacao pendente), nao indexacao.

## Automatico
O GitHub Actions faz o envio apos pushes em `main` que alterem fontes de conteudo/SEO mapeadas no workflow, e aguarda o deploy Vercel. Nao notifica a cada commit de CSS, efeitos ou ajustes cosmeticos.

## Alteracoes de produtos diretamente no CRM
O catalogo pode mudar pelo banco Supabase sem nenhum push ao GitHub. **Nesses casos o workflow NAO dispara automaticamente**. Depois de uma alteracao significativa em nomes, itens, preco ou disponibilidade, acesse Actions > Street Goose 034 - IndexNow > Run workflow > `categories` e execute apenas apos publicar a alteracao. Como proxima melhoria, integrar uma chamada autenticada no backend apos salvar o catalogo, com debounce, logs e protecao contra abuso. Nao chamar a API do navegador do cliente.

## Executar manualmente (Node >= 20)
```bash
INDEXNOW_SCOPE=categories node scripts/indexnow-notify.mjs
INDEXNOW_SCOPE=all node scripts/indexnow-notify.mjs
```

Nunca usar IndexNow para repetir solicitacoes diariamente sem mudancas de conteudo. Nao enviar URLs privadas ou de administracao. O sitemap e o robots.txt permanecem as referencias de descobrimento.

## Verificacoes apos deploy
1. Verificar HTTP 200 da chave no dominio oficial; corpo igual a chave.
2. Verificar `https://www.streetgoose034.com.br/sitemap.xml` e `robots.txt`.
3. Confirmar status da Action; HTTP 200/202 da API significa aceite.
4. Consultar IndexNow no Bing Webmaster Tools para ver historico de URLs enviadas, considerando o atraso de processamento.
5. Conferir que paginas `/conta`, `/checkout`, `/admin`, `/pedido` nao aparecem no lote.

## Observacao sobre Cloudflare
Se Crawler Hints/IndexNow automatico ja estiver ativado na Cloudflare, avalie evitar duplicidade de notificacoes para os mesmos eventos.
