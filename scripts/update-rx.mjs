// Curated brand-name candidates; verify identity against official prescription labels.
// Run manually, never during builds or gameplay. Existing difficulty flags survive refreshes.
import { readFile, writeFile } from 'node:fs/promises';

const names = `Abilify Actemra Actos Aczone Adcirca Adempas Afrezza Aimovig Ajovy Akynzeo
Alecensa Alimta Alinia Alunbrig Amitiza Amrix Anoro Apidra Aptiom Arava Arcalyst Aricept
Arnuity Aromasin Asacol Aubagio Austedo Auvelity Avandia Avapro Avelox Avonex Axert
Azilect Banzel Belbuca Benicar Benlysta Biktarvy Brilinta Briviact Bystolic Cabometyx
Calquence Caplyta Carafate Cardura Cayston Celebrex Cequa Ceraxon Cialis Cimzia Cinvanti
Ciprodex Clobex Clozaril Colcrys Combigan Comtan Concerta Copaxone Corlanor Cosentyx
Cosopt Creon Cresemba Crestor Cymbalta Daliresp Dapsone Dayvigo Delzicol Descovy Desyrel
Dexilant Diovan Dovato Droxia Duavee Dulera Durezol Edarbi Edurant Effient Eliquis
Elmiron Emend Emflaza Emgality Empliciti Enbrel Entresto Entyvio Epclusa Erivedge Erleada
Esbriet Eucrisa Evista Exelon Farxiga Fasenra Fetzima Finacea Firazyr Flomax Focalin
Forteo Fulyzaq Fycompa Gazyva Genvoya Gilenya Gleevec Glyxambi Gralise Halaven Harvoni
Hetlioz Horizant Humira Ibrance Iclusig Imbruvica Ingrezza Inlyta Inspra Intuniv Invega
Invokana Jakafi Janumet Januvia Jardiance Jentadueto Juluca Kadcyla Kaletra Keppra
Kesimpta Keytruda Kisqali Klonopin Korlym Kymriah Lamictal Latuda Lenvima Letairis
Levemir Lexapro Linzess Livalo Lonsurf Lopreeza Lorbrena Lucentis Lunesta Lyrica Lyumjev
Mavyret Mekinist Merrem Mirapex Mitigare Motegrity Myrbetriq Namenda Namzaric Nardil
Nayzilam Nerlynx Neupro Nexavar Nilotinib Ninlaro Nivestym Nucala Nucynta Nuplazid Nurtec
Ocrevus Odefsey Ofev Olumiant Onglyza Onpattro Opdivo Opsumit Orencia Orilissa Otezla
Oxtellar Ozempic Pamelor Plaquenil Plavix Pomalyst Praluent Prandin Prevymis Pristiq
Prolia Promacta Qelbree Qsymia Qulipta Ranexa Rapaflo Rasuvo Rayaldee Relistor Renvela
Repatha Restasis Rexulti Rezurock Rinvoq Ritalin Rozerem Rybelsus Rydapt Saphris Savella
Segluromet Seroquel Silenor Simponi Skyrizi Soliqua Soliris Sonidegib Sovaldi Spravato
Sprycel Stelara Stendra Stiolto Strattera Stribild Stromectol Suboxone Sunosi Sutent
Symbyax Symlin Synjardy Tafinlar Tagrisso Taltz Tamiflu Tasigna Tecfidera Tegretol
Tekturna Tembexa Terazol Tibsovo Tirosint Tivicay Toujeo Tradjenta Trazimera Trelegy
Tremfya Tresiba Trikafta Trintellix Triumeq Trodelvy Trulance Trulicity Truvada Turalio
Tybost Tysabri Ubrelvy Uceris Uptravi Valcyte Valtrex Vemlidy Venclexta Verzenio
Vesicare Viibryd Vimpat Viread Vitrakvi Vraylar Vumerity Vyvanse Vyzulta Wakix Xalkori
Xarelto Xeljanz Xenazine Xgeva Xiidra Xofluza Xolair Xospata Xtandi Xyrem Yervoy
Yonsa Zavesca Zejula Zelboraf Zeposia Zerbaxa Zetia Zoladex Zoloft Zomig Zonegran
Zortress Zubsolv Zykadia Zyprexa Zytiga`.split(/\s+/);
// Deliberately recognizable names stay documented but are omitted from rounds.
const obvious = new Set(['Ozempic', 'Ritalin', 'Zoloft', 'Cialis']);
const root = new URL('../', import.meta.url);
const target = new URL('data/rx.json', root);
let previous = [];
try { previous = JSON.parse(await readFile(target, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const old = new Map(previous.map(entry => [entry.name, entry]));
const entries = [];
const provenance = [];
const missing = [];
const verified = new Date().toISOString().slice(0, 10);
// Keep the initial pack small. Extra candidates cover brands missing exact label matches.
for (const name of names) {
  if (entries.filter(entry => !entry.TooObvious).length >= 180) break;
  const api = new URL('https://api.fda.gov/drug/label.json');
  api.searchParams.set('search', `openfda.brand_name:"${name}" AND openfda.product_type:"HUMAN PRESCRIPTION DRUG"`);
  api.searchParams.set('limit', '10');
  const response = await fetch(api, { signal: AbortSignal.timeout(30000) });
  if (response.status === 404) { missing.push(name); continue; }
  if (!response.ok) throw new Error(`Label lookup failed for ${name}: ${response.status}`);
  const body = await response.json();
  const candidates = body.results.filter(record => record.openfda?.brand_name?.some(brand => brand.toLowerCase() === name.toLowerCase())
    && record.openfda.product_type?.includes('HUMAN PRESCRIPTION DRUG') && record.openfda.generic_name?.length && record.set_id
    && !record.openfda.generic_name.some(generic => generic.toLowerCase() === name.toLowerCase()));
  candidates.sort((a, b) => Number(b.openfda.is_original_packager?.includes(true)) - Number(a.openfda.is_original_packager?.includes(true)));
  const label = candidates[0];
  if (!label) { missing.push(name); continue; }
  const ingredient = label.openfda.generic_name.join(' / ').toLowerCase();
  const url = `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${label.set_id}`;
  entries.push({ name, category: 'drug', description: `Prescription brand for ${ingredient}.`, url, TooObvious: old.get(name)?.TooObvious ?? obvious.has(name) });
  provenance.push({ name, source: api.href, labelUrl: url, setId: label.set_id, brandNames: label.openfda.brand_name, genericNames: label.openfda.generic_name, productTypes: label.openfda.product_type, verified });
  if (entries.length % 30 === 0) console.log(`Verified ${entries.length} brands`);
  // Stay below the public endpoint's request limit.
  await new Promise(resolve => setTimeout(resolve, 300));
}
if (entries.filter(entry => !entry.TooObvious).length < 150) throw new Error('Fewer than 150 verified playable brands; preserving current data.');
await writeFile(target, JSON.stringify(entries, null, 2) + '\n');
await writeFile(new URL('data/rx-provenance.json', root), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ stored: entries.length, playable: entries.filter(entry => !entry.TooObvious).length, skipped: missing }));
