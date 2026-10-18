const form = document.getElementById("authForm");
const mensagem = document.getElementById("msg");
const cadastro = form.dataset.modo === "cadastro";
const $ = (id) => document.getElementById(id);
const lembrar = $("lembrar");

if (lembrar && localStorage.getItem("emailLembrado")) {
  $("usuario").value = localStorage.getItem("emailLembrado");
  lembrar.checked = true;
}

function dizer(texto, ok = false) {
  mensagem.textContent = texto;
  mensagem.className = `msg ${ok ? "ok" : "erro"}`;
}

function destinoAposLogin() {
  const volta = new URLSearchParams(location.search).get("volta");
  if (!volta) return "index.html";

  const destino = new URL(volta, location.origin);
  const pagina = destino.pathname.split("/").pop();
  const paginasPermitidas = new Set([
    "index.html",
    "category.html",
    "minhas-empresas.html",
    "cadastroempresa.html",
  ]);
  if (destino.origin !== location.origin || !paginasPermitidas.has(pagina)) {
    return "index.html";
  }
  if (pagina === "cadastroempresa.html") {
    const id = destino.searchParams.get("id");
    return id && /^[\w-]{1,80}$/.test(id)
      ? `${pagina}?id=${encodeURIComponent(id)}`
      : pagina;
  }
  return pagina;
}

async function vincularEmpresasAntigas() {
  const { error } = await db.rpc("claim_legacy_companies");
  if (error) {
    return error;
  }
  return null;
}

function mensagemErroLogin(error) {
  if (error.status === 400 && error.message.includes("Email not confirmed")) {
    return "Confirme seu e-mail pelo link enviado antes de entrar.";
  }
  if (
    error.status === 400 &&
    error.message.toLowerCase().includes("invalid login credentials")
  ) {
    return "E-mail ou senha incorretos. Se a conta foi criada antes da migração, cadastre-a novamente.";
  }
  return mensagemErroSupabase(error);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("usuario").value.trim().toLowerCase();
  const senha = $("senha").value;
  const botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    if (cadastro) {
      if (senha.length < 6) {
        throw new Error("A senha deve ter ao menos 6 caracteres.");
      }
      if (senha !== $("confirmarSenha").value) {
        throw new Error("As senhas não coincidem.");
      }

      const { data, error } = await db.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome: $("nome").value.trim() },
        },
      });

      if (error) {
        throw new Error(
          error.message.includes("already registered")
            ? "Este e-mail já possui uma conta. Faça login."
            : mensagemErroSupabase(error),
        );
      }

      if (!data.session) {
        dizer(
          "Conta criada. Confirme seu e-mail pelo link enviado para poder entrar.",
          true,
        );
        return;
      }

      const erroVinculo = await vincularEmpresasAntigas();
      if (erroVinculo) {
        console.error("Não foi possível vincular empresas antigas:", erroVinculo);
      }
      dizer(
        erroVinculo
          ? "Conta criada, mas os cadastros antigos não foram vinculados. Confira a configuração SQL."
          : "Cadastro realizado! Entrando...",
        !erroVinculo,
      );
      if (erroVinculo) {
        setTimeout(() => {
          location.href = destinoAposLogin();
        }, 2500);
        return;
      }
      location.href = destinoAposLogin();
      return;
    }

    const { error: erroLogin } = await db.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (erroLogin) throw erroLogin;

    if (lembrar.checked) localStorage.setItem("emailLembrado", email);
    else localStorage.removeItem("emailLembrado");

    const erroVinculo = await vincularEmpresasAntigas();
    if (erroVinculo) {
      console.error("Não foi possível vincular empresas antigas:", erroVinculo);
      dizer(
        `Login realizado. Não foi possível vincular empresas antigas: ${mensagemErroSupabase(erroVinculo)}`,
      );
      setTimeout(() => {
        location.href = destinoAposLogin();
      }, 2500);
      return;
    }

    dizer("Login realizado com sucesso!", true);
    location.href = destinoAposLogin();
    return;
  } catch (error) {
    dizer(cadastro ? mensagemErroSupabase(error) : mensagemErroLogin(error));
  } finally {
    botao.disabled = false;
  }
});
