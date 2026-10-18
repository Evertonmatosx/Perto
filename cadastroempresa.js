const form = document.getElementById("formEmpresa");
const botao = document.getElementById("btnCadastrar");
const mensagem = document.getElementById("mensagemCadastro");
const categoriaSelect = document.getElementById("categoria");
const logoInput = document.getElementById("logo");
const logoPreview = document.getElementById("logoPreview");
const empresaId = new URLSearchParams(location.search).get("id");
const campos = [
  "nome",
  "categoria",
  "descricao",
  "telefone",
  "cidade",
  "endereco",
  "servicos",
];
let user;
let empresaAtual;
let previewUrl;

CATEGORIAS.forEach((categoria) => {
  const option = h("option", "", categoria);
  option.value = categoria;
  categoriaSelect.append(option);
});

function dizer(texto, ok = false) {
  mensagem.textContent = texto;
  mensagem.className = `msg ${ok ? "ok" : "erro"}`;
}

function mostrarLogo(url) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  logoPreview.hidden = !url;
  if (url) logoPreview.src = url;
  else logoPreview.removeAttribute("src");
}

async function iniciar() {
  user = await usuarioLogado();
  if (!user) {
    location.replace(
      `login.html?volta=${encodeURIComponent(
        empresaId
          ? `cadastroempresa.html?id=${encodeURIComponent(empresaId)}`
          : "cadastroempresa.html",
      )}`,
    );
    return false;
  }

  if (!empresaId) return true;

  const { data, error } = await db
    .from("empresas")
    .select("id, nome, categoria, descricao, telefone, cidade, endereco, servicos, logo_url")
    .eq("id", empresaId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Não foi possível carregar a empresa:", error);
    dizer(mensagemErroSupabase(error));
    botao.disabled = true;
    return false;
  }
  if (!data) {
    dizer("Empresa não encontrada ou não vinculada à sua conta.");
    botao.disabled = true;
    return false;
  }

  empresaAtual = data;
  campos.forEach((id) => {
    document.getElementById(id).value = data[id] || "";
  });
  mostrarLogo(data.logo_url);
  document.querySelector(".cadastro-intro h1").textContent = "Editar empresa";
  botao.textContent = "Salvar alterações";
  return true;
}

function validarArquivo(file) {
  if (!file) return;
  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
  if (!tiposPermitidos.includes(file.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
}

function caminhoLogo(url) {
  if (!url) return null;
  const prefixo = `/storage/v1/object/public/logos-empresas/`;
  const indice = url.indexOf(prefixo);
  if (indice < 0) return null;
  return decodeURIComponent(url.slice(indice + prefixo.length));
}

async function enviarLogo(file) {
  validarArquivo(file);
  const extensao = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[file.type];
  const caminho = `${user.id}/${crypto.randomUUID()}.${extensao}`;
  const { error } = await db.storage
    .from("logos-empresas")
    .upload(caminho, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data } = db.storage.from("logos-empresas").getPublicUrl(caminho);
  return { caminho, url: data.publicUrl };
}

logoInput.addEventListener("change", () => {
  try {
    const file = logoInput.files[0];
    validarArquivo(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = file ? URL.createObjectURL(file) : null;
    if (previewUrl) {
      logoPreview.src = previewUrl;
      logoPreview.hidden = false;
    } else {
      mostrarLogo(empresaAtual?.logo_url);
    }
  } catch (error) {
    logoInput.value = "";
    mostrarLogo(empresaAtual?.logo_url);
    dizer(error.message);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!user || (empresaId && !empresaAtual)) return;

  botao.disabled = true;
  botao.textContent = "Salvando...";
  mensagem.textContent = "";
  let novoCaminhoLogo;

  try {
    const dados = Object.fromEntries(
      campos.map((id) => [id, document.getElementById(id).value.trim()]),
    );
    dados.owner_id = user.id;
    dados.status = "pendente";

    const arquivo = logoInput.files[0];
    if (arquivo) {
      const imagem = await enviarLogo(arquivo);
      novoCaminhoLogo = imagem.caminho;
      dados.logo_url = imagem.url;
    }

    let error;
    if (empresaAtual) {
      ({ error } = await db
        .from("empresas")
        .update(dados)
        .eq("id", empresaAtual.id)
        .eq("owner_id", user.id));
    } else {
      ({ error } = await db.from("empresas").insert(dados));
    }
    if (error) throw error;

    if (novoCaminhoLogo) {
      const caminhoAntigo = caminhoLogo(empresaAtual?.logo_url);
      if (caminhoAntigo) {
        const { error: erroRemocao } = await db.storage
          .from("logos-empresas")
          .remove([caminhoAntigo]);
        if (erroRemocao) {
          console.error("Não foi possível remover a imagem anterior:", erroRemocao);
        }
      }
    }

    dizer(
      empresaAtual
        ? "Alterações enviadas para aprovação."
        : "Cadastro enviado! Aguarde a aprovação.",
      true,
    );
    location.href = "minhas-empresas.html";
  } catch (error) {
    console.error("Erro ao salvar empresa:", error);
    if (novoCaminhoLogo) {
      const { error: erroLimpeza } = await db.storage
        .from("logos-empresas")
        .remove([novoCaminhoLogo]);
      if (erroLimpeza) {
        console.error("Não foi possível remover a imagem não utilizada:", erroLimpeza);
      }
    }
    dizer(mensagemErroSupabase(error));
    botao.disabled = false;
    botao.textContent = empresaAtual ? "Salvar alterações" : "Cadastrar empresa";
  }
});

(async () => {
  await iniciar();
})();
