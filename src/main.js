
const btnGuardia = document.querySelector("#btnGuardia");
const btnJogar = document.querySelector("#btnJogar");

btnGuardia.addEventListener("click", () => {
  window.location.href = "/guardia.html";
});

btnJogar.addEventListener("click", () => {
  window.location.href = "/jogador.html";
});