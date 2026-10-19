# Runbook de rollback — lançamento SEO e medição (19/10/2026)

Cada camada volta separada. Nesta entrega **não houve mudança de banco, de mídia original nem de integração externa**.

## 1. Código e deploy (Vercel)

O que mudou: HTML por rota, sitemap, robots, llms.txt, favicon, camada de eventos, carregamento de vídeos sob demanda, rewrites e cabeçalhos no `vercel.json`.

**Mais rápido (minutos), sem tocar no Git:**
1. Vercel → projeto `street-goose-034-landing` → Deployments.
2. Escolha o deploy de produção anterior (commit `2ad1c74`, PR #30) → menu ⋯ → **Promote to Production** (ou "Instant Rollback").
3. Confira `https://www.streetgoose034.com.br/` e `/categoria/lupas`.

**Definitivo (Git):**
1. `git revert <commit do squash deste PR>` no `main`, num PR próprio.
2. O deploy automático publica o estado anterior.

Atenção: o `vercel.json` traz o hash de segurança (CSP) do script da intro. Código e `vercel.json` precisam voltar **juntos** (o revert faz isso). Se só um dos dois voltar, a intro fica bloqueada pelo navegador.

## 2. Banco (Supabase)

Esta entrega não alterou tabelas, funções nem dados. O build só **lê** `public.products` com a chave pública para montar o HTML das categorias.

Ajustes de dados feitos antes, no mesmo dia, se precisarem voltar:
- Peças duplicadas ocultas (trajes-13, perfumes-36): no painel → Produtos, desmarcar "Oculto do site". Ou: `delete from public.products where id in ('trajes-13','perfumes-36');`
- Aviso por e-mail da conta admin: Conta → Preferências → desligar "Receber também por e-mail".

## 3. Mídia

Nenhum arquivo de mídia original foi apagado ou substituído. As fotos WebP (`assets/web-products/`, PR #30) têm fallback automático para as originais. Para voltar a servir as originais, remova o bloco `webGlobs` de `js/catalog.js`.

## 4. Integrações

- Cloudflare, Resend, Supabase Auth e Google: nada alterado.
- Analytics: nenhum fornecedor foi ligado, então não há nada para desligar. Os eventos só existem na memória da página (`dataLayer`).
- Search Console e Bing: se o sitemap já tiver sido enviado e o site voltar, o sitemap some (404) e os buscadores param de usá-lo sozinhos. Não é preciso remover nada.

## 5. Verificação depois de qualquer rollback

1. A home abre com a intro e o hero toca.
2. `/categoria/lupas` abre a categoria; o ESC volta para a home na mesma posição.
3. Popup aparece uma vez e fecha com X e ESC.
4. Login, sacola e checkout até o WhatsApp funcionam.
5. Console sem erro de CSP (`Refused to execute inline script`).
