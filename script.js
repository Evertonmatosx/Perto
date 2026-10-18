
//CARROSSEL//

const carrossel = document.querySelector(".carrossel-container");
const botaoAnterior = document.querySelector(".carrossel-anterior");
const botaoProximo = document.querySelector(".carrossel-proximo");

if (carrossel && botaoAnterior && botaoProximo) {
  const cartoesOriginais = Array.from(carrossel.querySelectorAll(".carrossel-item"));
  const quantidadeCartoes = cartoesOriginais.length;
  let temporizadorRolagem;

  if (quantidadeCartoes > 0) {
    const criarCopia = (cartao) => {
      const copia = cartao.cloneNode(true);
      copia.setAttribute("aria-hidden", "true");
      copia.setAttribute("inert", "");
      copia.removeAttribute("tabindex");
      return copia;
    };

    const copiaAnterior = document.createDocumentFragment();
    const copiaPosterior = document.createDocumentFragment();

    cartoesOriginais.forEach((cartao) => {
      copiaAnterior.append(criarCopia(cartao));
    });
    cartoesOriginais.forEach((cartao) => {
      copiaPosterior.append(criarCopia(cartao));
    });

    carrossel.prepend(copiaAnterior);
    carrossel.append(copiaPosterior);

    const primeiroOriginal = carrossel.children[quantidadeCartoes];
    const primeiroClone = carrossel.children[0];
    let distanciaCiclo = primeiroOriginal.offsetLeft - primeiroClone.offsetLeft;
    carrossel.scrollLeft = distanciaCiclo;

    const atualizarDistanciaCiclo = () => {
      distanciaCiclo = primeiroOriginal.offsetLeft - primeiroClone.offsetLeft;
    };

    const reposicionarSeNecessario = () => {
      atualizarDistanciaCiclo();
      let deslocamento = 0;

      if (carrossel.scrollLeft < distanciaCiclo) {
        deslocamento = distanciaCiclo;
      } else if (carrossel.scrollLeft >= distanciaCiclo * 2) {
        deslocamento = -distanciaCiclo;
      }

      if (deslocamento !== 0) {
        carrossel.style.scrollBehavior = "auto";
        carrossel.scrollLeft += deslocamento;
        carrossel.style.scrollBehavior = "";
      }
    };

    const ajustarLimites = () => {
      clearTimeout(temporizadorRolagem);
      temporizadorRolagem = setTimeout(reposicionarSeNecessario, 120);
    };

    const rolarCartao = (direcao) => {
      const cartao = carrossel.querySelector(".carrossel-item");
      const espacamento = parseFloat(getComputedStyle(carrossel).gap) || 0;
      carrossel.scrollBy({
        left: direcao * (cartao.getBoundingClientRect().width + espacamento),
        behavior: "smooth",
      });
    };

    botaoAnterior.addEventListener("click", () => rolarCartao(-1));
    botaoProximo.addEventListener("click", () => rolarCartao(1));
    carrossel.addEventListener("scroll", ajustarLimites);
    window.addEventListener("resize", reposicionarSeNecessario);
  }
}