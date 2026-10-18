const lista = document.getElementById("listaEmpresas");
const mensagem = document.getElementById("mensagemEmpresas");

async function carregarEmpresasDaConta() {
  const user = await usuarioLogado();
  if (!user) {
    location.replace("login.html?volta=minhas-empresas.html");
    return;
  }

  const { data, error } = await db
    .from("empresas")
    .select("id, nome, categoria, status, logo_url")
    .eq("owner_id", user.id)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Não foi possível carregar as empresas da conta:", error);
    mensagem.textContent = mensagemErroSupabase(error);
    return;
  }

  const empresas = data || [];
  if (!empresas.length) {
    mensagem.textContent = "Ainda não há empresas vinculadas à sua conta.";
    return;
  }

  mensagem.textContent = `${empresas.length} empresa${empresas.length === 1 ? "" : "s"} na sua conta.`;
  lista.replaceChildren(
    ...empresas.map((empresa) => {
      const card = h("article", "local-card empresa-conta-card");
      if (empresa.logo_url) {
        const imagem = h("img");
        imagem.src = empresa.logo_url;
        imagem.alt = `Imagem de ${empresa.nome}`;
        imagem.loading = "lazy";
        card.append(imagem);
      }

      const corpo = h("div", "local-corpo");
      corpo.append(
        h("span", "tag", empresa.status || "Pendente"),
        h("h3", "", empresa.nome),
        h("p", "", empresa.categoria),
      );
      const editar = h("a", "btn-category", "Editar empresa");
      editar.href = `cadastroempresa.html?id=${encodeURIComponent(empresa.id)}`;
      corpo.append(editar);
      card.append(corpo);
      return card;
    }),
  );
}

carregarEmpresasDaConta();
