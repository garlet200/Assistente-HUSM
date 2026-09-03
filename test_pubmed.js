const { searchPubMed } = require('./src/lib/ai/pubmed.ts');

// We need to compile or run ts-node. Let's just use a quick JS script to test the logic
const fetch = require('node-fetch'); // might not be available in node < 18, but node is v20+

async function test() {
  const query = 'Myocardial Infarction AND Therapeutics';
  const searchUrl = https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term= + encodeURIComponent(query + ' AND (Review[ptyp] OR Clinical Trial[ptyp])') + &retmode=json&retmax=3&sort=relevance;
  
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const ids = searchData.esearchresult?.idlist || [];
  
  if (ids.length === 0) return console.log('Nenhum artigo encontrado no PubMed para esta busca.');

  const fetchUrl = https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id= + ids.join(',') + &retmode=xml;
  const fetchRes = await fetch(fetchUrl);
  const xml = await fetchRes.text();

  const articles = [];
  const articleMatches = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  
  for (const articleXml of articleMatches) {
    const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const titleMatch = articleXml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/);
    
    const abstractMatches = articleXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
    let abstract = '';
    if (abstractMatches) {
      abstract = abstractMatches.map(tag => tag.replace(/<[^>]+>/g, '')).join(' ');
    }

    if (pmidMatch && titleMatch) {
      articles.push(PMID: \nTítulo: \nResumo: );
    }
  }
  console.log(articles.join('\n\n'));
}

test();
