const params = new URLSearchParams(location.search);
const estado = {
  termo: (params.get("q") || "").trim(),
  cat: CATEGORIAS.includes(params.get("cat")) ? params.get("cat") : "",
};
let locais = [];

const lista = document.getElementById("lista");
const vazio = document.getElementById("vazio");
const contagem = document.getElementById("contagem");
const filtros = document.getElementById("filtros");
const busca = document.getElementById("busca");

const norm = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function criarCard(l) {
  const card = h("article", "local-card");
  if (l.logo_url) {
    const imagem = h("img");
    imagem.src = l.logo_url;
    imagem.alt = `Imagem de ${l.nome}`;
    imagem.loading = "lazy";
    card.append(imagem);
  }
  const corpo = h("div", "local-corpo");
  corpo.append(h("span", "tag", l.categoria), h("h3", "", l.nome));
  if (l.descricao) corpo.append(h("p", "", l.descricao));
  if (l.servicos) corpo.append(h("p", "", "Serviços: " + l.servicos));
  const onde = [l.endereco, l.cidade].filter(Boolean).join(", ");
  corpo.append(h("p", "", onde));

  const acoes = h("div", "acoes");
  const mapa = h("a", "btn-mapa", "Ver no mapa");
  mapa.href = "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent([l.nome, onde].join(", "));
  acoes.append(mapa);

  let fone = (l.telefone || "").replace(/\D/g, "");
  if (fone.length >= 10) {
    if (fone.length <= 11) fone = "55" + fone;
    const w = h("a", "btn-mapa", "WhatsApp");
    w.href = "https://wa.me/" + fone;
    acoes.append(w);
  }
  acoes.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
  corpo.append(acoes);
  card.append(corpo);
  return card;
}

function renderizar() {
  const t = norm(estado.termo);
  const res = locais.filter((l) =>
    (!estado.cat || l.categoria === estado.cat) &&
    (!t || norm([l.nome, l.descricao, l.servicos, l.cidade, l.categoria].join(" ")).includes(t)));
  lista.replaceChildren(...res.map(criarCard));
  vazio.hidden = res.length > 0;
  contagem.textContent = res.length === 1 ? "1 local encontrado" : `${res.length} locais encontrados`;
}

function renderizarFiltros() {
  filtros.replaceChildren(...["", ...CATEGORIAS].map((c) => {
    const b = h("button", "chip", c || "Todos");
    b.type = "button";
    b.setAttribute("aria-pressed", String(estado.cat === c));
    b.onclick = () => { estado.cat = c; atualizarUrl(); renderizarFiltros(); renderizar(); };
    return b;
  }));
}

function atualizarUrl() {
  const p = new URLSearchParams();
  if (estado.termo) p.set("q", estado.termo);
  if (estado.cat) p.set("cat", estado.cat);
  history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
}

document.getElementById("form-busca").addEventListener("submit", (e) => {
  e.preventDefault();
  estado.termo = busca.value.trim();
  atualizarUrl();
  renderizar();
});

async function carregar() {
  contagem.textContent = "Carregando...";
  const { data, error } = await db
    .from("empresas")
    .select("id, nome, categoria, descricao, cidade, endereco, telefone, servicos, logo_url")
    .eq("status", "aprovada")
    .order("criado_em", { ascending: false });
  if (error) {
    console.error(error);
    contagem.textContent = mensagemErroSupabase(error);
    return;
  }
  locais = data || [];
  renderizar();
}

busca.value = estado.termo;
renderizarFiltros();
carregar();
