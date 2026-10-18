const SUPABASE_URL = "https://rfnzbwuwckvdzajjfurr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cfJBdcBpJJSNQQBa6UU7IQ_FdswqIRI";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const CATEGORIAS = [
  "Alimentação", "Beleza e estética", "Comércio", "Educação",
  "Informática e tecnologia", "Saúde", "Serviços automotivos",
  "Serviços domésticos", "Outros",
];

const h = (tag, cls, txt) => {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (txt) element.textContent = txt;
  return element;
};

function mensagemErroSupabase(error) {
  if (!error) return "Erro desconhecido do Supabase.";
  if (
    error.name === "AuthRetryableFetchError" ||
    error instanceof TypeError ||
    error.message === "Failed to fetch"
  ) {
    return "Não foi possível alcançar o Supabase. Verifique a conexão e tente novamente.";
  }
  if (error.code === "PGRST202" || error.code === "42883") {
    return "Uma função necessária não existe no banco. Execute a configuração SQL do projeto.";
  }
  if (error.code === "42501" || error.status === 403) {
    return "O Supabase recusou o acesso. Verifique as políticas de acesso (RLS).";
  }
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "A tabela necessária não existe no banco. Confira a configuração do Supabase.";
  }
  if (error.code === "42703" || error.code === "PGRST204") {
    return "Uma coluna necessária não existe no banco. Atualize o esquema do Supabase.";
  }
  return error.message || "O Supabase retornou um erro inesperado.";
}

async function usuarioLogado() {
  const { data, error } = await db.auth.getUser();
  if (error) {
    if (error.name !== "AuthSessionMissingError") {
      console.error("Não foi possível verificar a sessão:", error);
    }
    return null;
  }
  return data.user;
}

(async () => {
  const ul = document.querySelector(".nav-links");
  if (!ul) return;

  const user = await usuarioLogado();
  const atual = location.pathname.split("/").pop() || "index.html";
  const itens = [
    ["index.html", "Início"],
    ["category.html", "Locais"],
    ...(user
      ? [
          ["minhas-empresas.html", "Minhas empresas"],
          ["cadastroempresa.html", "Cadastrar empresa"],
        ]
      : [
          ["login.html", "Entrar"],
          ["cadastro.html", "Cadastrar-se"],
        ]),
  ];

  ul.replaceChildren(
    ...itens.map(([href, texto]) => {
      const li = h("li");
      const link = h("a", "", texto);
      link.href = href;
      if (href === atual) link.setAttribute("aria-current", "page");
      li.append(link);
      return li;
    }),
  );

  if (user) {
    const li = h("li");
    const botao = h("button", "link-sair", "Sair");
    botao.type = "button";
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      const { error } = await db.auth.signOut();
      if (error) {
        console.error("Não foi possível encerrar a sessão:", error);
        botao.disabled = false;
        return;
      }
      location.href = "index.html";
    });
    li.append(botao);
    ul.append(li);
  }
})();
