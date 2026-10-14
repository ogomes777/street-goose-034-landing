# Assistente Street Goose: ativação e verificação

O código usa a Vercel AI Gateway no servidor. Os modelos foram confirmados no catálogo: `openai/gpt-4.1-mini`, `openai/whisper-1` e `openai/tts-1`. A credencial nunca é enviada ao navegador.

## Ativação

1. Entre na conta Vercel que hospeda `street-goose-034-landing`.
2. Abra **AI Gateway** nessa equipe. Conclua a ativação ou verificação solicitada. Se o provedor informar falta de saldo, habilite o uso na própria conta.
3. O deploy tenta usar OIDC automaticamente. Se a tela do CRM disser que não há configuração, crie uma chave em **AI Gateway → API Keys** e adicione `AI_GATEWAY_API_KEY` nas variáveis do projeto, ambiente **Production**, como valor sensível. Cole a chave apenas nesse campo, nunca no chat ou no código. Faça redeploy após salvar.
4. Não crie uma variável `VITE_AI_GATEWAY_API_KEY`: esse prefixo enviaria a credencial ao navegador.

A conta do proprietário precisa estar na tabela de administradores já usada pelo CRM. A API confirma a sessão e a permissão antes de cada solicitação.

## Teste pelo proprietário

1. Abra `/admin` e selecione **Assistente IA**.
2. Pergunte: “Quanto entrou e saiu nos últimos trinta dias?” Confira os valores com a aba Financeiro.
3. Pergunte: “E como ficou comparado ao período anterior?” O contexto da conversa fica somente nesta tela; as cifras são consultadas novamente.
4. Pergunte por um cliente, produto, pedido ou cupom. Confira a fonte e os períodos da resposta. Listas são paginadas; não equivalem ao total da loja.
5. Grave um áudio, pare, ouça a prévia e toque em **Transcrever áudio**. Confira o texto antes de enviar. A gravação é enviada ao provedor apenas nessa ação ou no envio de uma pergunta com áudio e sem texto.
6. Toque em **Gerar áudio**, use o player e baixe o MP3. A segunda reprodução reutiliza o áudio, sem nova geração.
7. Exporte o PNG e confira números, períodos e fontes.

## O que está implementado

- Conversa de texto com histórico recente, ferramentas de consulta e respostas com referências.
- Relatórios agregados das áreas, detalhes de clientes/pedidos com período e paginação, consultas de produtos, comunidade, cupons, recompensas, níveis e newsletter.
- Transcrição de gravação no servidor, resposta de voz em MP3 e leitura alternativa pelo navegador.
- Gráficos e imagens de relatório a partir de valores do banco.
- Autorização de administrador, somente leitura, limite de consultas e proteção contra cifras sem referência nos cards/gráficos.

## Limites reais

A IA não inventa dados inexistentes: disponibilidade de produto não é quantidade de estoque; caixa não é lucro contábil. Dados pessoais de contato exigem abrir o cadastro; não são encaminhados nas respostas das ferramentas ao modelo. A conversa não é persistida após sair da tela. As respostas consultam registros existentes; a interpretação pode exigir esclarecimento.

Os testes automatizados verificam autenticação, autorização, referências e o fluxo com respostas simuladas do provedor. A geração real e o microfone físico precisam ser confirmados pelos passos acima. Nenhum sucesso de build comprova saldo ou acesso ao provedor.

Documentação: https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc
