const form = document.querySelector("form");
const results = document.getElementById("results");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const keyword = event.target.querySelector("input[name=keyword]").value;
  const pages = parseInt(event.target.querySelector("input[name=pages]").value);

  results.innerHTML = "";

  for (let i = 0; i <= pages * 10; i += 10) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await fetch(
      `https://cn.bing.com/search?q=${keyword}&first=${i + 1}`
    );
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const results = doc.querySelectorAll("li.b_algo");
    for (const result of results) {
      const title = result.querySelector("h2").textContent;
      const link = result.querySelector("a").href;
      const resultElement = document.createElement("div");
      resultElement.innerHTML = `<a href="${link}">${title}</a>`;
      results.appendChild(resultElement);
    }
  }
});
