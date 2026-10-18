const $ = (id) => document.getElementById(id);
const lista = $("lista");
const status = $("status");
const form = $("adminForm");

function dizer(texto, erro = false) {
  $("msg").textContent = texto;
  $("msg").className = `msg ${erro ? "erro" : "ok"}`;
}

async function abrirPainel(user) {
  if (user?.app_metadata?.role !== "admin") {
    const { error } = await db.auth.signOut();
    if (error) {
      console.error("Não foi possível encerrar a sessão sem permissão:", error);
    }
    form.hidden = false;
    $("painel").hidden = true;
    dizer(
      "A conta entrou, mas ainda não tem acesso administrativo. Crie-a no Supabase Auth, execute supabase-admin-setup.sql com o e-mail da conta e entre novamente.",
      true,
    );
    return false;
  }
  form.hidden = true;
  $("painel").hidden = false;
  await carregar();
  return true;
}

async function carregar() {
  const { data, error } = await db
    .from("empresas")
    .select("id, nome, categoria, descricao, cidade, endereco, telefone")
    .eq("status", "pendente")
    .order("criado_em");

  if (error) {
    console.error("Erro ao carregar empresas pendentes:", error);
    status.textContent = mensagemErroSupabase(error);
    return;
  }

  status.textContent = data.length
    ? `${data.length} aguardando análise`
    : "Nenhuma empresa pendente.";

  lista.replaceChildren(
    ...data.map((empresa) => {
      const card = h("article", "local-card");
      const corpo = h("div", "local-corpo");
      corpo.append(
        h("span", "tag", empresa.categoria),
        h("h3", "", empresa.nome),
        h("p", "", empresa.descricao || "Sem descrição"),
        h("p", "", [empresa.endereco, empresa.cidade].filter(Boolean).join(", ")),
        h("p", "", empresa.telefone || "Sem telefone"),
      );
      const acoes = h("div", "acoes");
      [["Aprovar", "aprovada", "btn-search"], ["Rejeitar", "rejeitada", "btn-rejeitar"]]
        .forEach(([texto, novoStatus, classe]) => {
          const botao = h("button", classe, texto);
          botao.type = "button";
          botao.addEventListener("click", async () => {
            botao.disabled = true;
            const { error: erroAtualizacao } = await db
              .from("empresas")
              .update({ status: novoStatus })
              .eq("id", empresa.id);
            if (erroAtualizacao) {
              console.error("Erro ao atualizar empresa:", erroAtualizacao);
              status.textContent = "Não foi possível atualizar a empresa.";
              botao.disabled = false;
            } else {
              await carregar();
            }
          });
          acoes.append(botao);
        });
      corpo.append(acoes);
      card.append(corpo);
      return card;
    }),
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: $("usuario").value.trim().toLowerCase(),
      password: $("senha").value,
    });
    if (error) throw error;
    await abrirPainel(data.user);
  } catch (error) {
    dizer(
      error.code === "invalid_credentials" ||
        error.message?.toLowerCase().includes("invalid login credentials")
        ? "E-mail ou senha incorretos. Use os dados da conta criada no Supabase Auth."
        : mensagemErroSupabase(error),
      true,
    );
  } finally {
    botao.disabled = false;
  }
});

$("sair").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) {
    console.error("Erro ao sair da administração:", error);
    status.textContent = "Não foi possível encerrar a sessão.";
    return;
  }
  location.reload();
});

(async () => {
  const user = await usuarioLogado();
  if (user) await abrirPainel(user);
})();
