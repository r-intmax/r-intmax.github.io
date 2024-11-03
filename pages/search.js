var document = window.document; 

function getCookie(name) {
    const cookies = document.cookie.split(";").map(cookie => cookie.trim());
    const matchedCookie = cookies.find(cookie => cookie.startsWith(name + "="));
    return matchedCookie ? matchedCookie.substring(name.length + 1) : "";
}

const expires = new Date(new Date().getTime() + (3 * 24 * 60 * 60 * 1000)).toUTCString();

if (!getCookie("restricted_domains")) {
    document.cookie = "restricted_domains=%20 -site:bing.com; expires=" + expires;
}

function updateCookie(action, domain) {
    const restrictedDomains = getCookie("restricted_domains");
    let newDomains;

    if (action === "shield") {
        newDomains = `${restrictedDomains} -site:${domain}`;
    } else {
        newDomains = restrictedDomains.replace(new RegExp(`\\s*-site:${domain}`), '').replace(/\s{2,}/g, ' ');
    }

    document.cookie = `restricted_domains=${newDomains.trim()}; expires=${expires}`;
}

var shield_context = {};

function shield(domain) {
	shield_context[domain] = document.getElementById(domain).innerHTML;
	document.getElementById(domain).innerHTML = '<button onclick="unshield(`' + domain + '`)"><svg style="width: 1em; height: 1em;" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 10L9 22L4 17" stroke="#00C853" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>已屏蔽' + domain + '</button><br><br>';
	if(getCookie("restricted_domains").indexOf('-site:' + domain) == -1){
		document.cookie = updateCookie("shield", domain);
	}
}

function unshield(domain){
	document.getElementById(domain).innerHTML = shield_context[domain];
	delete shield_context[domain];
	document.cookie = updateCookie("unshield", domain);
}

function toggleShield(domain) {
    const isCurrentlyShielded = getCookie("restricted_domains").includes(domain);
    const buttonText = isCurrentlyShielded ? '可展示' : '已屏蔽';
    const action = isCurrentlyShielded ? 'unshield' : 'shield';
	updateCookie(action, domain);
    document.getElementById(domain).innerHTML = `<button onclick="toggleShield('${domain}')">${buttonText} ${domain}</button><br>`;
}

function showHideRestrictedDomains() {
    const currentDomains = getCookie("restricted_domains").split(" -site:").slice(1);
    const isHidden = document.getElementById("restricted_domains_list").innerHTML.includes("隐藏当前屏蔽站点列表");

    let html = isHidden ?
		'<button onclick="showHideRestrictedDomains()">展示当前屏蔽站点列表</button><br>': 
		'<button onclick="showHideRestrictedDomains()">隐藏当前屏蔽站点列表</button><br>';

    if (!isHidden) {
        currentDomains.forEach(domain => {
            html += `<span id="${domain}"><button onclick="toggleShield('${domain}')">已屏蔽${domain}</button><br></span>`;
        });
    }

    document.getElementById("restricted_domains_list").innerHTML = html;
}

class CleanResult{
	extractBingResults(html) {
		const results = [];
		new DOMParser().parseFromString(html, "text/html").querySelectorAll("li.b_algo").forEach(result => {
			const title = result.querySelector("h2").textContent;
			const href = result.querySelector("a").href;
			const content = result.querySelector("div.b_caption").textContent.replace("网页", "").split("·")[result.querySelector("div.b_caption").textContent.indexOf("·") != -1 ? 1 : 0].trim();
			results.push({ title, href, content });
		});
		return results;
	}

	extractGoogleMirrorResults(html) {
		const results = [];

		const mainDiv = new DOMParser().parseFromString(html, "text/html").getElementById('main');
		const childDivs = Array.from(mainDiv.children);

		console.log(childDivs);
	
		childDivs.forEach(div => {
			const links = Array.from(div.getElementsByTagName('a'));
			links.forEach(link => {
				if (link.querySelector('h3') && link.href.match(/.*?q=(.*)/)) {
					console.log(link.href);
					const href = link.href.match(/.*?q=(.*)/)[1].replace(/:\//g, '://');
					const title = link.querySelector('h3').textContent;
					const match = div.outerHTML.match(/<.*>(.*?)\.\.\..*?<\/.*?>/);
					results.push({ title, href, match? match[1].trim(): '' });
				}
			});
		});
		console.log(results);
		return results;
	}

	resultPhrase(keyword, html, domains) {
		const shield_text = (text) => ' <button onclick="shield(`' + text + '`)"><svg style="width: 1em; height: 1em;" width="100" height="100" viewBox="0 0 100 100"> <circle cx="50" cy="50" r="45" fill="white" stroke="red" stroke-width="10" /> <line x1="20" y1="20" x2="80" y2="80" stroke="red" stroke-width="10" /> </svg>屏蔽' + text + "</button><br>";
		const replace = (text) => text.replace(/</g, "&lt;").replace(/>/g, '&gt;');
		
		let retstr = "<h4>\"" + keyword + "\"的搜索结果:</h4>";
		
		this.extractGoogleMirrorResults(html).forEach(result => {
			const title = replace(result.title);
			const link = result.href;
			const content = replace(result.content) + "<br>";
			const domain = link.split("/")[2].split(".").slice(["com.cn", "edu.cn"].some((element) => link.includes(element)) ? -3 : -2).join(".");
			const new_html_head = "<a href=\"" + link + "\" target=\"_blank\">" + title + "</a>" ;
			const { [domain]: items } = domains;
			if (!items || items.every(item => !title.includes(item))) {	// bug
				domains[domain] = items ? [...items, new_html_head + "<br>" + content] : [new_html_head + shield_text(domain) + content];
			}
		});
		Object.entries(domains).forEach(([domain, results]) => {
			retstr += '<div id="' + domain + '">' + results[0] + (results.length == 1 ? "<br>" : "<details><summary>更多来自" + domain + "的结果</summary>" + [...results.slice(1)].join("<br>") + "<br><a href=\"https://cn.bing.com/search?q=" + keyword + "+site:" + domain + "\" target=\"_blank\">更多来自" + domain + "的结果</a></details><br>" ) + '</div>';
		});
		return [domains, retstr + '<div style="margin-top: 20px;"><button type="button" style="background-color: #007bff; color: #fff; padding: 10px; width: 100%; border: none; border-radius: 5px; cursor: pointer;" onclick="domainRequester.newPage()">下一页</button></div>'];
	}

};

class DomainRequester {
    constructor() {
        this.domainList = {};
        this.key = "";
        this.pages = 1;
        this.resultElement = document.getElementById('result');
    }
	
	newPage(){
		this.newRequestHead(this.key);
	}

    newRequestHead(keyword) {
        if (this.key !== keyword) {
            this.pages = 1;
            this.key = keyword;
            this.domainList = {};
            this.resultElement.innerHTML = "";
        } else {
            this.pages += 10;
        }
        this.newRequest(this.key, this.pages);
    }

    newRequest(keyword, pages) {
        this.resultElement.innerHTML += '<h2>加载中...</h2>';	
        
        const xhr = new XMLHttpRequest();
	xhr.open('GET', `https://cursosonlineja.com/wp-content/plugins/super-links/application/helpers/super-links-proxy.php?https://www.google.com/search?q=${keyword}+${getCookie("restricted_domains")}&start=${pages}`);

        xhr.onload = () => {
            const result = xhr.responseText;
            const [updatedDomainList, info] = new CleanResult().resultPhrase(keyword, result, this.domainList);
            this.domainList = updatedDomainList;
            this.resultElement.innerHTML = info;
        };
		
        xhr.onerror = () => this.resultElement.innerHTML = `<h2 style="color: red;">网络连接中断, 请稍后重试</h2>`;
        xhr.timeout = 6000;
        xhr.ontimeout = () => this.resultElement.innerHTML = `<h2 style="color: red;">请求超时, 请稍后重试</h2>`;
        
        xhr.send();
    }
};
