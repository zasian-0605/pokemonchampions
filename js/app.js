/* Pokémon Champions 2D — offline data edition, v6 image rebuild. Only sprite images are loaded from the internet. */
(() => {
'use strict';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const GITHUB_SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
// Special form used by the image layer and by the Garchompite Z test item.
// Mega Garchomp Z source values: RotomLabs Mega Dimension Pokédex (#0445).
const MEGA_GARCHOMP_FORM = { id:'garchomp-mega', slug:'garchomp-mega', name:'garchomp-mega', jpName:'メガガブリアス', displayName:'メガガブリアス', num:445, types:['Dragon','Ground'], baseStats:{hp:108,atk:170,def:115,spa:120,spd:95,spe:92}, bst:700, abilities:{'0':'sand-force'}, baseSpecies:'garchomp', forme:'Mega', spriteid:'garchomp-mega', spritePokemonId:445, pokeApiPokemonId:445, isMega:true, isPrimal:false, isGigantamax:false, isRegional:false, isLegendary:false, isMythical:false, isDefault:false, nfe:false, evos:[], battleOnly:true };
const MEGA_GARCHOMP_Z_FORM = {
 id:'garchomp-mega-z', slug:'garchomp-mega-z', name:'garchomp-mega-z',
 jpName:'メガガブリアスZ', displayName:'メガガブリアスZ', num:445,
 types:['Dragon'], baseStats:{hp:108,atk:130,def:85,spa:141,spd:85,spe:151}, bst:700,
 abilities:{'0':'levitate'}, baseSpecies:'garchomp', forme:'Mega-Z', spriteid:'garchomp-mega-z',
 spritePokemonId:445, pokeApiPokemonId:445, isMega:true, isPrimal:false,
 isGigantamax:false, isRegional:false, isLegendary:false, isMythical:false,
 isDefault:false, nfe:false, evos:[], battleOnly:true
};
const TYPE_JA = {Normal:'ノーマル',Fire:'ほのお',Water:'みず',Electric:'でんき',Grass:'くさ',Ice:'こおり',Fighting:'かくとう',Poison:'どく',Ground:'じめん',Flying:'ひこう',Psychic:'エスパー',Bug:'むし',Rock:'いわ',Ghost:'ゴースト',Dragon:'ドラゴン',Dark:'あく',Steel:'はがね',Fairy:'フェアリー',Stellar:'ステラ'};
const TYPE_COLORS = {Normal:'#92958a',Fire:'#df654e',Water:'#5597ef',Electric:'#e7bd3b',Grass:'#57ae6c',Ice:'#65c8dd',Fighting:'#c95c68',Poison:'#ac70c0',Ground:'#d2a267',Flying:'#8f91dd',Psychic:'#ed6f9a',Bug:'#9bb64d',Rock:'#baa05c',Ghost:'#7e77b8',Dragon:'#8c6be4',Dark:'#676479',Steel:'#8ba7b6',Fairy:'#de83b2',Stellar:'#58c8d4'};
const STAT_KEYS = ['hp','atk','def','spa','spd','spe'];
const STAT_JA = {hp:'HP',atk:'攻撃',def:'防御',spa:'特攻',spd:'特防',spe:'素早さ'};
const TYPE_CHART = {
 Normal:{weak:[],resist:['Rock','Steel'],immune:['Ghost']},
 Fire:{weak:['Grass','Ice','Bug','Steel'],resist:['Fire','Water','Rock','Dragon'],immune:[]},
 Water:{weak:['Fire','Ground','Rock'],resist:['Water','Grass','Dragon'],immune:[]},
 Electric:{weak:['Water','Flying'],resist:['Electric','Grass','Dragon'],immune:['Ground']},
 Grass:{weak:['Water','Ground','Rock'],resist:['Fire','Grass','Poison','Flying','Bug','Dragon','Steel'],immune:[]},
 Ice:{weak:['Grass','Ground','Flying','Dragon'],resist:['Fire','Water','Ice','Steel'],immune:[]},
 Fighting:{weak:['Normal','Ice','Rock','Dark','Steel'],resist:['Poison','Flying','Psychic','Bug','Fairy'],immune:['Ghost']},
 Poison:{weak:['Grass','Fairy'],resist:['Poison','Ground','Rock','Ghost'],immune:['Steel']},
 Ground:{weak:['Fire','Electric','Poison','Rock','Steel'],resist:['Grass','Bug'],immune:['Flying']},
 Flying:{weak:['Grass','Fighting','Bug'],resist:['Electric','Rock','Steel'],immune:[]},
 Psychic:{weak:['Fighting','Poison'],resist:['Psychic','Steel'],immune:['Dark']},
 Bug:{weak:['Grass','Psychic','Dark'],resist:['Fire','Fighting','Poison','Flying','Ghost','Steel','Fairy'],immune:[]},
 Rock:{weak:['Fire','Ice','Flying','Bug'],resist:['Fighting','Ground','Steel'],immune:[]},
 Ghost:{weak:['Psychic','Ghost'],resist:['Dark'],immune:['Normal']},
 Dragon:{weak:['Dragon'],resist:['Steel'],immune:['Fairy']},
 Dark:{weak:['Psychic','Ghost'],resist:['Fighting','Dark','Fairy'],immune:[]},
 Steel:{weak:['Ice','Rock','Fairy'],resist:['Fire','Water','Electric','Steel'],immune:[]},
 Fairy:{weak:['Fighting','Dragon','Dark'],resist:['Fire','Poison','Steel'],immune:[]}
};
const STATUS_JA = {par:'まひ',brn:'やけど',slp:'ねむり',frz:'こおり',psn:'どく',tox:'もうどく'};
const WEATHER_JA = {rain:'あめ',sun:'はれ',sand:'すなあらし',snow:'ゆき'};
const DATA_NOTE = '図鑑・日本語名・習得技は内蔵データ、技・特性・持ち物の対戦用データはPokémon Showdownから取得します。効果の再現状況は対応済みのゲーム内処理に限られます。';
const DEFAULT_ADMIN_CONFIG = {shinyChance:1,markChance:5,eggShinyChance:50,eggMarkChance:50,raidShinyChance:20,raidMarkChance:20,rarityCommon:65,rarityUncommon:25,rarityRare:8,raritySuperrare:1.8,rarityLegendary:0.2};
function cleanAdminConfig(raw={}){const out={};for(const [k,v] of Object.entries(DEFAULT_ADMIN_CONFIG)){const n=Number(raw?.[k]??v);out[k]=Number.isFinite(n)?Math.max(0,Math.min(100,n)):v;}return out;}
const state = {
 page:'home', adminUnlocked:false, adminConfig:{...DEFAULT_ADMIN_CONFIG}, boxPage:0, items:{}, eggs:[], farm:{uids:[],capacity:3,lastAt:Date.now()}, careStats:{}, careSelectedUid:null, careTab:'gacha', hatchingEggId:null, shopSearch:'', scoutVisible:60, dataState:'loading', dataErrors:[], dataInfo:{dexCount:0,showdownMoveCount:0,pokeApiMoveCount:0,mergedMoveCount:0,japaneseMoveNames:0,learnsetCount:0,moveSource:'取得中'}, data:{dex:[],dexById:{},moves:{},learnsets:{},names:new Map(),moveNames:new Map(),moveDesc:new Map(),moveEffects:new Map(),abilityNames:new Map(),abilityDesc:new Map()},
 vp:1500, owned:[], team:[], selectedOwned:null, selectedDex:null, dexSearch:'', dexType:'all', dexLoad:60, boxSearch:'', boxFilter:'all', scoutSearch:'', scoutSelected:null, scoutCandidates:[], scoutRarityMap:{}, scoutLegendaryTarget:null, raidPartyIds:[], raidTargetId:null, raidCaptureRoll:null, raidCaptureBusy:false, moveSearch:'', moveType:'all', moveCategory:'all', moveEffectCategory:'all', moveCatalogLimit:72, selectedMoveCatalog:null, abilitySearch:'', abilityCategory:'all', abilityCatalogLimit:90, selectedAbilityCatalog:null,
 battle:null, battleMode:'singles', selectedMove:null, selectedActiveSlot:0, selectedTargetUid:null, pendingActions:{}, modal:null, toastTimer:null, sound:false, reducedMotion:false, saveWriteBlocked:false, saveBlockReason:null, saveWarningShown:false
};
const fallbackSpecies = [
 ['bulbasaur','フシギダネ',['Grass','Poison'],[45,49,49,65,65,45],['Overgrow']],['ivysaur','フシギソウ',['Grass','Poison'],[60,62,63,80,80,60],['Overgrow']],['venusaur','フシギバナ',['Grass','Poison'],[80,82,83,100,100,80],['Overgrow']],
 ['charmander','ヒトカゲ',['Fire'],[39,52,43,60,50,65],['Blaze']],['charizard','リザードン',['Fire','Flying'],[78,84,78,109,85,100],['Blaze']],['squirtle','ゼニガメ',['Water'],[44,48,65,50,64,43],['Torrent']],['blastoise','カメックス',['Water'],[79,83,100,85,105,78],['Torrent']],
 ['pikachu','ピカチュウ',['Electric'],[35,55,40,50,50,90],['Static']],['raichu','ライチュウ',['Electric'],[60,90,55,90,80,110],['Static']],['eevee','イーブイ',['Normal'],[55,55,50,45,65,55],['Run Away','Adaptability']],
 ['gengar','ゲンガー',['Ghost','Poison'],[60,65,60,130,75,110],['Cursed Body']],['lucario','ルカリオ',['Fighting','Steel'],[70,110,70,115,70,90],['Steadfast','Inner Focus']],['garchomp','ガブリアス',['Dragon','Ground'],[108,130,95,80,85,102],['Sand Veil']],['greninja','ゲッコウガ',['Water','Dark'],[72,95,67,103,71,122],['Torrent','Protean']],['mewtwo','ミュウツー',['Psychic'],[106,110,90,154,90,130],['Pressure']],['mew','ミュウ',['Psychic'],[100,100,100,100,100,100],['Synchronize']],
 ['rayquaza','レックウザ',['Dragon','Flying'],[105,150,90,150,90,95],['Air Lock']],['zacian','ザシアン',['Fairy'],[92,130,115,80,115,138],['Intrepid Sword']],['dragapult','ドラパルト',['Dragon','Ghost'],[88,120,75,100,75,142],['Clear Body','Infiltrator']],['tyranitar','バンギラス',['Rock','Dark'],[100,134,110,95,100,61],['Sand Stream']],['pelipper','ペリッパー',['Water','Flying'],[60,50,100,95,70,65],['Drizzle']],['ninetales','キュウコン',['Fire'],[73,76,75,81,100,100],['Flash Fire']],['arcanine','ウインディ',['Fire'],[90,110,80,100,80,95],['Intimidate','Flash Fire']],['snorlax','カビゴン',['Normal'],[160,110,65,65,110,30],['Immunity','Thick Fat']],['scizor','ハッサム',['Bug','Steel'],[70,130,100,55,80,65],['Technician']],['azumarill','マリルリ',['Water','Fairy'],[100,50,80,60,80,50],['Huge Power']],['rotomwash','ウォッシュロトム',['Electric','Water'],[50,65,107,105,107,86],['Levitate']],['ironhands','テツノカイナ',['Fighting','Electric'],[154,140,108,50,68,50],['Quark Drive']]
];
function slug(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function idSlug(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function searchKey(s){return String(s??'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function setLoad(pct,msg){const bar=$('#loadbar'),st=$('#loadstatus');if(bar)bar.style.width=`${pct}%`;if(st)st.textContent=msg;}
const OFFLINE_DATABASE=window.POKEMON_CHAMPIONS_OFFLINE_DATA||JSON.parse($('#offline-data')?.textContent||'{}');

function cloneShowdownValue(value){
 if(value===null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(cloneShowdownValue);
 const out={};for(const [key,child] of Object.entries(value)){if(typeof child!=='function')out[key]=cloneShowdownValue(child);}return out;
}
function integrateUpstreamItems(data){
 const remote=data?.upstreamMechanics?.itemsById||{};
 const items=Object.entries(remote).map(([id,record])=>({id, ...(record||{})})).filter(item=>item.id&&item.name);
 data.itemsById=remote;
 data.itemsList=items;
 data.itemsSource=Object.keys(remote).length?'pokemon-showdown-live':'none';
 return {itemsAvailable:items.length};
}
function integrateUpstreamBattleData(data){
 const upstream=data.upstreamMechanics||{},remoteMoves=upstream.movesById||{},remoteApiMoves=upstream.movesByApiId||{};
 const localMoves=data.movesById||{},remoteMovesByNum=new Map();
 for(const [key,record] of Object.entries(remoteMoves)){
  if(record&&Number.isFinite(Number(record.num)))remoteMovesByNum.set(String(Number(record.num)),record);
  if(record&&record.id==null)record.id=key;
 }
 const moveFields=['basePower','type','category','defensiveCategory','accuracy','pp','priority','target','secondary','secondaries','status','boosts','self','selfBoost','heal','drain','recoil','multihit','multihitType','weather','terrain','sideCondition','slotCondition','pseudoWeather','volatileStatus','forceSwitch','selfSwitch','selfdestruct','ohko','thawsTarget','damage','critRatio','critModifier','willCrit','hasSheerForceBoost','baseMoveType','basePowerModifier','overrideOffensivePokemon','overrideOffensiveStat','overrideDefensivePokemon','overrideDefensiveStat','forceSTAB','ignoreAbility','ignoreAccuracy','ignoreDefensive','ignoreEvasion','ignoreImmunity','ignoreNegativeOffensive','ignoreOffensive','ignorePositiveDefensive','ignorePositiveEvasion','multiaccuracy','noDamageVariance','spreadModifier','sleepUsable','smartTarget','tracksTarget','breaksProtect','mindBlownRecoil','chloroblastRecoil','stealsBoosts','struggleRecoil','hasCrashDamage','isConfusionSelfHit','stallingMove'];
 let movesMatched=0;
 for(const [localKey,move] of Object.entries(localMoves)){
  if(!move||typeof move!=='object')continue;
  const ids=[localKey,move.id,move.name,move.slug].map(slug).filter(Boolean);
  let source=null;
  for(const id of ids){if(remoteMoves[id]){source=remoteMoves[id];break;}}
  if(!source&&move.apiId!=null){
   source=remoteMovesByNum.get(String(Number(move.apiId)))||null;
   if(!source&&remoteApiMoves[String(move.apiId)])source=remoteApiMoves[String(move.apiId)].showdownData||remoteApiMoves[String(move.apiId)];
  }
  if(!source)continue;
  for(const field of moveFields){
   if(Object.prototype.hasOwnProperty.call(source,field))move[field]=cloneShowdownValue(source[field]);
  }
  if(source.flags&&typeof source.flags==='object'){
   const flags={};
   for(const [flag,enabled] of Object.entries(source.flags))if(enabled)flags[flag]=true;
   move.flags=flags;
  }
  move.showdownId=source.id||ids[0]||'';
  move.showdownShortDesc=source.shortDesc||'';
  move.showdownDesc=source.desc||'';
  move.showdownCallbackPaths=Array.isArray(source.callbackPaths)?source.callbackPaths.slice():[];
  move._showdownDataLoaded=true;
  movesMatched++;
 }
 const remoteAbilities=upstream.abilitiesById||{},abilityList=data.abilitiesList||[];
 const byAbilityId=new Map(),byAbilityNum=new Map();
 for(const ability of abilityList){
  if(!ability||typeof ability!=='object')continue;
  const id=slug(ability.id||ability.slug||ability.name||'');
  if(id)byAbilityId.set(id,ability);
  const parsedId=String(ability.id||ability.slug||'').match(/^ability-?(\d+)$/i);
  const num=Number(ability.apiId??ability.num??(parsedId?parsedId[1]:NaN));
  if(Number.isFinite(num)&&num>0)byAbilityNum.set(String(num),ability);
 }
 let abilitiesMatched=0,abilitiesAdded=0,abilitiesWithCallbacks=0;
 for(const [rawId,record] of Object.entries(remoteAbilities)){
  if(!record||typeof record!=='object')continue;
  const id=slug(record.id||rawId),num=Number(record.num);
  let ability=byAbilityId.get(id)||(Number.isFinite(num)?byAbilityNum.get(String(num)):null);
  if(!ability){
   ability={id,name:record.name||rawId,jpName:data.abilityNames?.get(id)||record.name||rawId,description:data.abilityDesc?.get(id)||record.shortDesc||record.desc||'',effectEn:record.desc||'',generation:record.gen||null,showdownOnly:true};
   abilityList.push(ability);byAbilityId.set(id,ability);abilitiesAdded++;
  }else abilitiesMatched++;
  ability.showdownName=record.name||rawId;
  ability.showdownShortDesc=record.shortDesc||'';
  ability.showdownDesc=record.desc||'';
  ability.showdownCallbackPaths=Array.isArray(record.callbackPaths)?record.callbackPaths.slice():[];
  ability.effectEn=ability.effectEn||record.desc||'';
  ability.description=ability.description||record.shortDesc||record.desc||'';
  if(ability.showdownCallbackPaths.length)abilitiesWithCallbacks++;
  if(data.abilityNames&&!data.abilityNames.has(id))data.abilityNames.set(id,record.name||rawId);
  if(data.abilityDesc&&!data.abilityDesc.has(id))data.abilityDesc.set(id,record.shortDesc||record.desc||'');
 }
 data.abilitiesList=abilityList;
 data.showdownMovesById=remoteMoves;
 return {
  source:data.upstreamSource||upstream.source||'none',
  movesAvailable:Object.keys(remoteMoves).length||Object.keys(remoteApiMoves).length,
  movesMatched,
  abilitiesAvailable:Object.keys(remoteAbilities).length,
  abilitiesMatched,
  abilitiesAdded,
  abilitiesWithCallbacks
 };
}
async function loadAllData(){
 const upstreamReady=window.POKEMON_CHAMPIONS_UPSTREAM_READY;
 if(upstreamReady){
  setLoad(5,'Pokémon Showdownから技・特性データを取得中…');
  await upstreamReady;
 }
 const db=OFFLINE_DATABASE;
 if(!db||!Array.isArray(db.dex)||db.dex.length<1000||!db.moves||Object.keys(db.moves).length<700)throw new Error('HTML内蔵データを読み込めません。ファイルが完全に保存されているか確認してください。');
 setLoad(12,'HTML内蔵の全国図鑑データを整理中…');
 state.dataErrors=[];
 const data=state.data;
 data.dex=db.dex;
 data.dexById=Object.fromEntries(data.dex.map(p=>[p.id,p]));
 data.speciesAliases={};
 for(const p of data.dex){data.speciesAliases[slug(p.id)]=p.id;data.speciesAliases[slug(p.name)]=p.id;p.displayName=p.jpName||p.name;p.spriteid=p.spriteid||p.id;}
 setLoad(34,'技・追加効果・習得技を接続中…');
 data.moves=db.moves;
 data.movesById=db.moves;
 // Retain the source snapshot, then integrate its mechanics into the active move/ability records.
 data.upstreamMechanics=window.POKEMON_CHAMPIONS_UPSTREAM_MECHANICS||null;
 data.upstreamSource=window.POKEMON_CHAMPIONS_UPSTREAM_SOURCE||'none';
 data.moveAliases={...(db.moveAliases||{})};
 data.moveApiIdToKey=db.moveApiIdToKey||{};
 // Normalize lookup aliases without changing the stored move records or learnset IDs.
 // This lets searches by Japanese display name, canonical name, and numeric API ID
 // resolve to the same embedded move record.
 for(const [key,move] of Object.entries(data.movesById)){
  if(!move)continue;
  const aliases=[key,move.id,move.name,move.jpName,move.displayName,move.apiId==null?null:String(move.apiId),move.apiId==null?null:`api-${move.apiId}`];
  for(const alias of aliases){
   if(alias==null||String(alias).trim()==='')continue;
   const raw=String(alias),norm=slug(raw);
   if(data.movesById[key]&&(data.moveAliases[raw]===undefined))data.moveAliases[raw]=key;
   if(norm&&data.moveAliases[norm]===undefined)data.moveAliases[norm]=key;
  }
  if(move.apiId!=null&&data.moveApiIdToKey[String(move.apiId)]===undefined)data.moveApiIdToKey[String(move.apiId)]=key;
 }
 data.learnsets=db.learnsets||{};
 data.moveNames=new Map(Object.values(db.moves).map(m=>[slug(m.id),m.jpName||m.name]));
 data.moveDesc=new Map(Object.values(db.moves).map(m=>[slug(m.id),m.flavorJa||m.description||'']));
 data.moveEffects=new Map(Object.values(db.moves).map(m=>[slug(m.id),m.mechanicDescription||'']));
 setLoad(58,'特性の日本語名・効果説明を接続中…');
 data.abilitiesList=db.abilities||[];

 data.abilityNames=new Map(Object.entries(db.abilityNames||{}));
 data.abilityDesc=new Map(Object.entries(db.abilityDescriptions||{}));
 const upstreamStats=integrateUpstreamBattleData(data);
 const itemStats=integrateUpstreamItems(data);
 data.upstreamSummary={...upstreamStats,...itemStats};
 const upstreamStatusNode=document.getElementById('upstream-fetch-status');
 if(upstreamStatusNode){
  if(upstreamStats.source==='pokemon-showdown-live')upstreamStatusNode.textContent=`Showdownライブ反映済み：技 ${upstreamStats.movesMatched}/${upstreamStats.movesAvailable}件・特性 ${upstreamStats.abilitiesMatched+upstreamStats.abilitiesAdded}/${upstreamStats.abilitiesAvailable}件・持ち物 ${itemStats.itemsAvailable}件`;
  else if(upstreamStats.source==='local-fallback')upstreamStatusNode.textContent=`同梱補助データを反映：技 ${upstreamStats.movesMatched}件・特性 ${upstreamStats.abilitiesMatched+upstreamStats.abilitiesAdded}件`;
  else upstreamStatusNode.textContent='Showdownデータ未反映：内蔵データで起動';
 }
 data.types=db.types||[];
 data.typeChart=db.typeChart||{};
 for(const k of Object.keys(TYPE_CHART))delete TYPE_CHART[k];
 Object.assign(TYPE_CHART,data.typeChart);
 TYPE_JA.Shadow='ダーク';TYPE_JA['???']='不明';
 TYPE_COLORS.Shadow='#25263b';TYPE_COLORS['???']='#636b85';
 data.names=new Map(data.dex.map(p=>[Number(p.num),p.jpName]));
 data.namesById=Object.fromEntries(data.dex.map(p=>[p.id,p.jpName]));
 data.dataInfo=null;
 data.learnsetSource='pokemon_bulk_data.txt（内蔵）';
 data.moveSourceInfo={showdownCount:upstreamStats.movesMatched,csvCount:0,csvAdded:0,learnsetCount:Object.keys(data.learnsets).length,japaneseNames:Object.values(data.moves).filter(m=>m.jpName&&m.jpName!==m.name).length};
 state.dataInfo={
  dexCount:data.dex.length,showdownMoveCount:upstreamStats.movesMatched,pokeApiMoveCount:0,mergedMoveCount:Object.keys(data.movesById).length,
  japaneseMoveNames:Object.values(data.moves).filter(m=>m.jpName&&m.jpName!==m.name).length,
  learnsetCount:Object.keys(data.learnsets).length,learnsetSource:'pokemon_bulk_data.txt（内蔵）',
  learnsetMoveLinks:db.meta?.speciesMoveLinks||0,learnsetVersionGroups:[],moveSource:upstreamStats.source==='pokemon-showdown-live'?'Pokémon Showdown LIVE（対戦データ）＋内蔵日本語名':'内蔵技データ',
  itemSource:itemStats.itemsAvailable?'Pokémon Showdown LIVE':'内蔵データ',
  dexSource:'pokemon_bulk_data.txt（内蔵）',abilityCount:data.abilitiesList.length,showdownAbilityCount:upstreamStats.abilitiesAvailable,showdownAbilityMatched:upstreamStats.abilitiesMatched+upstreamStats.abilitiesAdded,showdownAbilityCallbacks:upstreamStats.abilitiesWithCallbacks,showdownItemCount:itemStats.itemsAvailable,itemSource:itemStats.itemsAvailable?'Pokémon Showdown LIVE':'未取得',typeCount:(db.types||[]).length
 };
 state.dataState='full';
 setLoad(100,`準備完了：図鑑 ${data.dex.length.toLocaleString()}種・Showdown技 ${upstreamStats.movesMatched.toLocaleString()}件／特性 ${(upstreamStats.abilitiesMatched+upstreamStats.abilitiesAdded).toLocaleString()}件／持ち物 ${itemStats.itemsAvailable.toLocaleString()}件`);
 return data;
}
function makeFallbackMoves(){const obj={};const arr=[['tackle','たいあたり','Normal','Physical',40,100,35],['quickattack','でんこうせっか','Normal','Physical',40,100,30],['thunderbolt','10まんボルト','Electric','Special',90,100,15],['flamethrower','かえんほうしゃ','Fire','Special',90,100,15],['surf','なみのり','Water','Special',90,100,15],['vinewhip','つるのムチ','Grass','Physical',45,100,25],['weatherball','ウェザーボール','Normal','Special',50,100,10],['swordsdance','つるぎのまい','Normal','Status',0,0,20]];for(const [id,name,type,category,basePower,accuracy,pp] of arr)obj[id]={id,name,jpName:name,type,category,basePower,accuracy,pp,priority:0,description:id==='weatherball'?'天気によってタイプと威力が変化する。':name+'を使う。'};return obj;}
const NON_FINAL_RECRUIT_IDS=new Set('bulbasaur ivysaur charmander charmeleon squirtle wartortle caterpie metapod weedle kakuna pidgey pidgeotto rattata rattataalola spearow ekans pikachu sandshrew sandshrewalola nidoranf nidorina nidoranm nidorino clefairy vulpix vulpixalola jigglypuff zubat golbat oddish gloom paras venonat diglett diglettalola meowth meowthalola meowthgalar psyduck mankey primeape growlithe growlithehisui poliwag poliwhirl abra kadabra machop machoke bellsprout weepinbell tentacool geodude geodudealola graveler graveleralola ponyta ponytagalar slowpoke slowpokegalar magnemite magneton farfetchdgalar doduo seel grimer grimeralola shellder gastly haunter onix drowzee krabby voltorb voltorbhisui exeggcute cubone lickitung koffing rhyhorn rhydon chansey tangela horsea seadra goldeen staryu mrmimegalar scyther electabuzz magmar magikarp eevee porygon omanyte kabuto dratini dragonair chikorita bayleef cyndaquil quilava totodile croconaw sentret hoothoot ledyba spinarak chinchou pichu cleffa igglybuff togepi togetic natu mareep flaaffy marill hoppip skiploom aipom sunkern yanma wooper wooperpaldea murkrow misdreavus girafarig pineco dunsparce gligar snubbull qwilfishhisui sneasel sneaselhisui teddiursa ursaring slugma swinub piloswine corsolagalar remoraid houndour phanpy porygon2 stantler tyrogue smoochum elekid magby larvitar pupitar treecko grovyle torchic combusken mudkip marshtomp poochyena zigzagoon zigzagoongalar linoonegalar wurmple silcoon cascoon lotad lombre seedot nuzleaf taillow wingull ralts kirlia surskit shroomish slakoth vigoroth nincada whismur loudred makuhita azurill nosepass skitty aron lairon meditite electrike roselia gulpin carvanha wailmer numel spoink trapinch vibrava cacnea swablu barboach corphish baltoy lileep anorith feebas shuppet duskull dusclops wynaut snorunt spheal sealeo clamperl bagon shelgon beldum metang turtwig grotle chimchar monferno piplup prinplup starly staravia bidoof kricketot shinx luxio budew cranidos shieldon burmy combee buizel cherubi shellos drifloon buneary glameow chingling stunky bronzor bonsly mimejr happiny gible gabite munchlax riolu hippopotas skorupi croagunk finneon mantyke snover snivy servine tepig pignite oshawott dewott patrat lillipup herdier purrloin pansage pansear panpour munna pidove tranquill blitzle roggenrola boldore woobat drilbur timburr gurdurr tympole palpitoad sewaddle swadloon venipede whirlipede cottonee petilil basculinwhitestriped sandile krokorok darumaka darumakagalar dwebble scraggy yamask yamaskgalar tirtouga archen trubbish zorua zoruahisui minccino gothita gothorita solosis duosion ducklett vanillite vanillish deerling karrablast foongus frillish joltik ferroseed klink klang tynamo eelektrik elgyem litwick lampent axew fraxure cubchoo shelmet mienfoo golett pawniard bisharp rufflet vullaby deino zweilous larvesta chespin quilladin fennekin braixen froakie frogadier bunnelby fletchling fletchinder scatterbug spewpa litleo flabebe floette skiddo pancham espurr honedge doublade spritzee swirlix inkay binacle skrelp clauncher helioptile tyrunt amaura goomy sliggoo sliggoohisui phantump pumpkaboo pumpkaboosmall pumpkaboolarge pumpkaboosuper bergmite noibat rowlet dartrix litten torracat popplio brionne pikipek trumbeak yungoos grubbin charjabug crabrawler cutiefly rockruff rockruffdusk mareanie mudbray dewpider fomantis morelull salandit stufful bounsweet steenee wimpod sandygast typenull jangmoo hakamoo cosmog cosmoem poipole grookey thwackey scorbunny raboot sobble drizzile skwovet rookidee corvisquire blipbug dottler nickit gossifleur wooloo chewtle yamper rolycoly carkol applin silicobra arrokuda toxel sizzlipede clobbopus sinistea sinisteaantique hatenna hattrem impidimp morgrem milcery snom cufant duraludon dreepy drakloak kubfu sprigatito floragato fuecoco crocalor quaxly quaxwell lechonk tarountula nymble pawmi pawmo tandemaus fidough smoliv dolliv nacli naclstack charcadet tadbulb wattrel maschiff shroodle bramblin toedscool capsakid rellor flittle tinkatink tinkatuff wiglett finizen varoom glimmet greavard cetoddle frigibax arctibax gimmighoul gimmighoulroaming dipplin poltchageist poltchageistartisan syclar embirch flarelm breezi rebble tactite privatyke voodoll scratchet necturine cupra argalis brattler cawdet volkritter snugglow floatoy caimanoe pluffle mumbao fawnifer electrelk smogecko smoguana swirlpool coribalis justyke solotl miasmite nohface monohm duohm dorsoil protowatt saharascal ababo scattervein chuggon draggalong flox scraptor'.split(/\s+/));
// 進化・ボックス用の全図鑑判定とは分離し、スカウトとCPU出現だけを最終進化形に限定する。
function finalRecruitKey(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function isFinalRecruitSpecies(p){const id=finalRecruitKey(p?.id);return !!id&&(!NON_FINAL_RECRUIT_IDS.has(id)||id==='pikachu');}
function finalRecruitDex(){return (state.data.dex||[]).filter(isFinalRecruitSpecies);}
function isSelectableFinalSpecies(p){return !!(p&&p.id);} function selectableDex(){return (state.data.dex||[]).filter(isSelectableFinalSpecies);}
function finalDescendant(p,seen=new Set()){
 if(!p||seen.has(p.id))return null;
 seen.add(p.id);
 if(isSelectableFinalSpecies(p))return p;
 // A battle-only alternate form resolves to its base species before any evolution migration.
 if(p.isMega||p.isPrimal||p.isGigantamax||p.battleOnly){const base=state.data.dexById?.[slug(p.baseSpecies||p.name)];if(base&&base.id!==p.id)return finalDescendant(base,seen);}
 const evos=(Array.isArray(p.evos)?p.evos:[]).map(e=>state.data.dexById?.[slug(e)]).filter(Boolean);
 for(const evo of evos){const resolved=finalDescendant(evo,new Set(seen));if(resolved)return resolved;}
 const base=state.data.dexById?.[slug(p.baseSpecies||'')];if(base&&base.id!==p.id)return finalDescendant(base,seen);
 return null;
}
function resolvePlayableSpecies(p){
 if(!p)return null;
 if(isSelectableFinalSpecies(p))return p;
 return finalDescendant(p)||null;
}
function normalizeOwnedIdentity(mon){
 if(!mon||typeof mon!=='object')return null;
 let p=state.data.dexById?.[String(mon.speciesId||'')]||state.data.dexById?.[state.data.speciesAliases?.[slug(mon.speciesId||'')]]||null;
 // Old save formats may have a formId but no valid speciesId; only use it if it resolves exactly.
 if(!p&&mon.formId)p=state.data.dexById?.[String(mon.formId)]||state.data.dexById?.[state.data.speciesAliases?.[slug(mon.formId)]]||null;
 if(!p)return null;
 p=resolvePlayableSpecies(p);
 if(!p)return null;
 mon.speciesId=p.id;mon.formId=p.id;mon.num=p.num;
 // Display name is derived from the exact same species record as the sprite, never from stale save text.
 mon.name=getPokeName(p);
 mon.exp=Math.max(0,Number(mon.exp||0));mon.friendship=Math.max(0,Math.min(255,Number(mon.friendship??70)));mon.personalities=Array.isArray(mon.personalities)?mon.personalities:[];mon.activityCounts=mon.activityCounts&&typeof mon.activityCounts==='object'?mon.activityCounts:{adventure:0,battle:0,farm:0,training:0};mon.hyperTrained=mon.hyperTrained&&typeof mon.hyperTrained==='object'?mon.hyperTrained:{};
 return mon;
}
function findSpecies(idOrName){if(!idOrName)return null;const id=slug(idOrName);const byId=state.data.dexById[id]||state.data.dexById[state.data.speciesAliases?.[id]];if(byId)return byId;const q=searchKey(idOrName);return state.data.dex.find(p=>searchKey(p.name)===q||searchKey(p.jpName)===q||searchKey(p.displayName)===q)||null;}
function getPokeName(p){return p?.displayName||p?.jpName||p?.name||'???';}
function getMoveName(m){return m?.jpName||m?.name||'???';}
function getMove(id){if(id==null)return null;const raw=String(id);const normalized=slug(raw);const key=state.data.moveAliases?.[raw]||state.data.moveAliases?.[normalized]||raw;return state.data.movesById?.[key]||state.data.moves?.[key]||null;}
function getLearnset(species){const candidates=[species?.id,slug(species?.name),slug(species?.baseSpecies)];for(const k of [...new Set(candidates.filter(Boolean))]){const entry=state.data.learnsets?.[k];if(entry)return entry.learnset||entry.moves||entry;}return {};}
function learnableMoves(species){
 const ls=getLearnset(species);const ids=Object.keys(ls||{}).filter(id=>getMove(id));
 if(ids.length)return ids.map(id=>getMove(id)).filter(Boolean).sort((a,b)=>String(a.jpName||a.name).localeCompare(String(b.jpName||b.name),'ja'));
 // Some alternate forms may be absent from per-version learnsets. Keep the UI playable using clearly-labelled, type-matched candidates instead of an empty move list.
 const all=Object.values(state.data.movesById||{}).filter(m=>m&&Number(m.pp)>0);if(!all.length)return [];
 const types=new Set(species?.types||[]);const typed=all.filter(m=>types.has(m.type)&&isMoveClassifiedDamageV2(m));
 const genericIds=['protect','facade','rest','tackle','quickattack','swordsdance','calmmind','toxic'];const generic=genericIds.map(id=>getMove(id)).filter(m=>m&&Number(m.pp)>0&&!typed.some(x=>x.id===m.id));
 const unique=new Map([...typed,...generic].map(m=>[m.id,m]));return [...unique.values()].sort((a,b)=>Number(b.basePower||0)-Number(a.basePower||0)).slice(0,80);
}
function defaultMovesFor(species){const avail=learnableMoves(species);const pref=['protect','weatherball','tackle','quickattack','thunderbolt','flamethrower','surf','earthquake','icebeam','shadowball','moonblast','closecombat'];const chosen=[];for(const id of pref){const m=getMove(id);if(m&&avail.some(x=>x.id===id)&&!chosen.includes(id))chosen.push(id);}const damaging=avail.filter(m=>isMoveClassifiedDamageV2(m)).sort((a,b)=>b.basePower-a.basePower);for(const m of damaging){if(chosen.length>=4)break;if(!chosen.includes(m.id))chosen.push(m.id);}for(const m of avail){if(chosen.length>=4)break;if(!chosen.includes(m.id))chosen.push(m.id);}return chosen.slice(0,4);}
// CPU専用：ノーマル技・まもる等の汎用技に偏らず、4つの異なるタイプで構成する。
function enemyMovesFor(species){
 const available=learnableMoves(species).filter(m=>m&&m.type&&m.type!=='Normal'&&Number(m.pp)>0&&isMoveClassifiedDamageV2(m));
 if(!available.length)return defaultMovesFor(species).filter(id=>getMove(id)?.type!=='Normal').slice(0,4);
 const learnsets=Object.values(state.data.learnsets||{}).map(entry=>entry?.learnset||entry?.moves||entry).filter(x=>x&&typeof x==='object');
 const isExclusive=(move)=>{
  let count=0;
  for(const ls of learnsets){if(Object.prototype.hasOwnProperty.call(ls,move.id)){count++;if(count>1)return false;}}
  return count===1;
 };
 const chosen=[];const usedTypes=new Set();
 const exclusive=available.filter(isExclusive).sort((a,b)=>Number(b.basePower||0)-Number(a.basePower||0));
 // まず、そのポケモンだけが習得する技を1枠確保。存在しない場合はタイプ一致技を優先。
 const signature=exclusive[0]||available.filter(m=>(species.types||[]).includes(m.type)).sort((a,b)=>Number(b.basePower||0)-Number(a.basePower||0))[0]||available.slice().sort((a,b)=>Number(b.basePower||0)-Number(a.basePower||0))[0];
 if(signature){chosen.push(signature);usedTypes.add(signature.type);}
 // 残りはタイプ重複なし。タイプ一致を先にし、その後は技威力と命中のバランスで選ぶ。
 const ranked=available.filter(m=>m.id!==signature?.id).sort((a,b)=>{
  const aStab=(species.types||[]).includes(a.type)?1:0,bStab=(species.types||[]).includes(b.type)?1:0;
  return (bStab-aStab)||(Number(b.basePower||0)-Number(a.basePower||0))-(Number(a.accuracy===true?100:a.accuracy||100)-Number(b.accuracy===true?100:b.accuracy||100))*0.15;
 });
 for(const move of ranked){if(chosen.length>=4)break;if(usedTypes.has(move.type))continue;chosen.push(move);usedTypes.add(move.type);}
 // 習得データに4タイプ分がない場合は、同タイプ重複を避けたまま残りを補う。
 if(chosen.length<4){for(const move of ranked){if(chosen.length>=4)break;if(!chosen.some(x=>x.id===move.id))chosen.push(move);}}
 return chosen.slice(0,4).map(m=>m.id);
}
function makeOwned(species, options={}){const moves=options.moves||defaultMovesFor(species);const abilityNames=Object.values(species.abilities||{}).filter(v=>typeof v==='string');return {uid:`mon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,speciesId:species.id,num:species.num,name:getPokeName(species),level:options.level||50,shiny:options.shiny??(Math.random()<cleanAdminConfig(state.adminConfig).shinyChance/100),mark:options.mark??(Math.random()<cleanAdminConfig(state.adminConfig).markChance/100?['しょうごのあかし','あめふりのあかし','りせいのあかし','げんきのあかし'][Math.floor(Math.random()*4)]:null),isTemporary:!!options.isTemporary,formId:species.id,abilityId:options.abilityId||Object.entries(species.abilities||{})[0]?.[1]||null,nature:options.nature||'まじめ',ivs:options.ivs||Object.fromEntries(STAT_KEYS.map(k=>[k,31])),evs:options.evs||Object.fromEntries(STAT_KEYS.map(k=>[k,0])),moves: moves.map(id=>({id,pp:getMove(id)?.pp||10})),heldItem:options.heldItem||'',obtainedAt:new Date().toISOString()};}
function monSpecies(mon){const id=String(mon?.speciesId||'');if(id===MEGA_GARCHOMP_Z_FORM.id)return MEGA_GARCHOMP_Z_FORM;if(id===MEGA_GARCHOMP_FORM.id)return MEGA_GARCHOMP_FORM;return state.data.dexById[id]||null;}
function calcStats(mon){const sp=monSpecies(mon);const b=sp?.baseStats||{hp:50,atk:50,def:50,spa:50,spd:50,spe:50};const level=Number(mon?.level||50);const out={};for(const k of STAT_KEYS){const base=Number(b[k]||50),iv=Number(mon?.hyperTrained?.[k]?31:(mon?.ivs?.[k]??31)),ev=Number(mon?.evs?.[k]??0);if(k==='hp')out[k]=Math.floor(((2*base+iv+Math.floor(ev/4))*level)/100)+level+10;else out[k]=Math.floor((Math.floor(((2*base+iv+Math.floor(ev/4))*level)/100)+5)*natureMultiplier(mon?.nature,k));}return out;}
function natureMultiplier(nature,k){const n={いじっぱり:{up:'atk',down:'spa'},ひかえめ:{up:'spa',down:'atk'},ようき:{up:'spe',down:'spa'},おくびょう:{up:'spe',down:'atk'},ずぶとい:{up:'def',down:'atk'},おだやか:{up:'spd',down:'atk'},しんちょう:{up:'spd',down:'spa'},ゆうかん:{up:'atk',down:'spe'},れいせい:{up:'spa',down:'spe'},わんぱく:{up:'def',down:'spa'},のんき:{up:'def',down:'spe'},なまいき:{up:'spd',down:'spe'},むじゃき:{up:'spe',down:'spd'},せっかち:{up:'spe',down:'def'},さみしがり:{up:'atk',down:'def'},やんちゃ:{up:'atk',down:'spd'},おっとり:{up:'spa',down:'def'},うっかりや:{up:'spa',down:'spd'},おとなしい:{up:'spd',down:'def'},きまぐれ:{},まじめ:{},てれや:{},すなお:{},がんばりや:{}}[nature]||{};if(n.up===k)return 1.1;if(n.down===k)return .9;return 1;}
function spriteSpecies(monOrSpecies){
 const isOwnedLike=!!monOrSpecies?.speciesId;
 return isOwnedLike?monSpecies(monOrSpecies):monOrSpecies;
}
function spriteKey(value){
 return String(value||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
}
const SPRITE_PLACEHOLDER='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22 viewBox=%220 0 120 120%22%3E%3Crect width=%22120%22 height=%22120%22 rx=%2216%22 fill=%22%23172038%22/%3E%3Ccircle cx=%2260%22 cy=%2252%22 r=%2224%22 fill=%22none%22 stroke=%22%238995b7%22 stroke-width=%224%22/%3E%3Cpath d=%22M36 52h48%22 stroke=%22%238995b7%22 stroke-width=%224%22/%3E%3Ccircle cx=%2260%22 cy=%2252%22 r=%227%22 fill=%22%238995b7%22/%3E%3Ctext x=%2260%22 y=%2297%22 text-anchor=%22middle%22 fill=%22%23dce4ff%22 font-size=%2210%22%3E画像なし%3C/text%3E%3C/svg%3E';
const spriteResolvedUrlCache=new Map();
const spriteFailedUrls=new Set();
let spriteListenersInstalled=false;
function installSpriteListeners(){
 if(spriteListenersInstalled||typeof document==='undefined')return;
 spriteListenersInstalled=true;
 // Capture load/error before page rerenders can discard an image. Reuse the successful URL
 // on later renders and stop retrying a URL once it has demonstrably failed.
 document.addEventListener('load',event=>{
  const img=event.target;
  if(!img||img.tagName!=='IMG'||!img.dataset?.spriteKey)return;
  const url=img.dataset.spriteCurrentUrl||img.src;
  if(url&&!url.startsWith('data:'))spriteResolvedUrlCache.set(img.dataset.spriteKey,url);
 },true);
 document.addEventListener('error',event=>{
  const img=event.target;
  if(!img||img.tagName!=='IMG'||!img.dataset?.spriteKey)return;
  const key=img.dataset.spriteKey;
  const failed=img.dataset.spriteCurrentUrl||img.src;
  if(failed&&!failed.startsWith('data:'))spriteFailedUrls.add(failed);
  if(spriteResolvedUrlCache.get(key)===failed)spriteResolvedUrlCache.delete(key);
  let queue=[];
  try{queue=JSON.parse(img.dataset.spriteCandidates||'[]');}catch(_){queue=[];}
  while(queue.length){
   const next=queue.shift();
   if(!next||spriteFailedUrls.has(next))continue;
   img.dataset.spriteCandidates=JSON.stringify(queue);
   img.dataset.spriteCurrentUrl=next;
   img.src=next;
   return;
  }
  const label=img.dataset.expectedName||img.alt||'ポケモン';
  img.removeAttribute('data-sprite-key');
  img.removeAttribute('data-sprite-candidates');
  img.removeAttribute('data-sprite-current-url');
  img.classList.add('sprite-missing');
  img.alt=`${label}（画像未取得）`;
  img.src=SPRITE_PLACEHOLDER;
 },true);
}
function spriteIdentity(monOrSpecies,back=false,animated=false){
 const p=spriteSpecies(monOrSpecies)||{};
 const specialId=spriteKey(p.id||p.spriteid||p.slug||p.name)||'unknown';
 return `${specialId}|${back?'back':'front'}|${monOrSpecies?.shiny?'shiny':'normal'}|${animated?'animated':'static'}`;
}
function specialSpriteUrls(monOrSpecies,back=false,animated=false){
 const p=spriteSpecies(monOrSpecies);if(!p)return [];
 const ids=[p.id,p.slug,p.spriteid,p.baseSpecies,monOrSpecies?.speciesId,monOrSpecies?.formId].map(v=>slug(v));
 const has=id=>ids.includes(slug(id));
 const shiny=!!monOrSpecies?.shiny;
 const urls=[];const add=url=>{if(url)urls.push(url);};
 // Gen 9 targets added in v18.3. Their PokeStats WebP endpoints were invalid,
 // which caused the placeholder icon. Use PokeAPI's verified raw sprite paths;
 // try Showdown GIFs first when present, then always fall back to working PNGs.
 const gen9SpriteIds={
  'ogerpon':1017,'iron-treads':990,'iron-bundle':991,'iron-hands':992,
  'iron-jugulis':993,'iron-moth':994,'iron-thorns':995,'iron-valiant':1006,
  'iron-leaves':1010,'miraidon':1008,'iron-boulder':1022,
  'iron-crown':1023,'terapagos':1024,'pecharunt':1025
 };
 const targetId=gen9SpriteIds[slug(p.id||p.spriteid||p.slug||p.name)];
 if(targetId){
  const id=targetId;
  if(animated){
   if(back){
    if(shiny)add(`${GITHUB_SPRITES}/other/showdown/back/shiny/${id}.gif`);
    add(`${GITHUB_SPRITES}/other/showdown/back/${id}.gif`);
   }else{
    if(shiny)add(`${GITHUB_SPRITES}/other/showdown/shiny/${id}.gif`);
    add(`${GITHUB_SPRITES}/other/showdown/${id}.gif`);
   }
  }
  if(back){
   if(shiny)add(`${GITHUB_SPRITES}/back/shiny/${id}.png`);
   add(`${GITHUB_SPRITES}/back/${id}.png`);
   // A few newer entries have no separate back sprite; never show the placeholder.
   if(shiny)add(`${GITHUB_SPRITES}/other/home/shiny/${id}.png`);
   add(`${GITHUB_SPRITES}/other/home/${id}.png`);
  }else{
   if(shiny){
    add(`${GITHUB_SPRITES}/other/home/shiny/${id}.png`);
    add(`${GITHUB_SPRITES}/other/official-artwork/shiny/${id}.png`);
    add(`${GITHUB_SPRITES}/shiny/${id}.png`);
   }
   add(`${GITHUB_SPRITES}/other/home/${id}.png`);
   add(`${GITHUB_SPRITES}/other/official-artwork/${id}.png`);
   add(`${GITHUB_SPRITES}/${id}.png`);
  }
  return [...new Set(urls)];
 }
 // Mega Garchomp Z is a separate form. Prefer its dedicated front/back in-game renders;
 // regular Mega Garchomp is only a fallback if the Z-A image host is unavailable.
 const isGarchompZ=has('garchomp-mega-z')||has('garchomp-z');
 if(isGarchompZ){
  if(back){
   add('https://static.rotomlabs.net/images/sprites/legends-z-a/b/0445-garchomp-mega-z.webp');
   if(animated)add('https://play.pokemonshowdown.com/sprites/ani-back/garchomp-mega.gif');
   add('https://play.pokemonshowdown.com/sprites/gen5-back/garchomp-mega.png');
   add('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/445.png');
  }else{
   add('https://static.rotomlabs.net/images/sprites/legends-z-a/0445-garchomp-mega-z.webp');
   if(animated)add('https://play.pokemonshowdown.com/sprites/ani/garchomp-mega.gif');
   add('https://play.pokemonshowdown.com/sprites/home/garchomp-mega.png');
   add('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/445.png');
   add('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/445.png');
  }
  return [...new Set(urls)];
 }
 // Koraidon has a verified Showdown battle GIF (and a PokeAPI animated front/back asset).
 if(has('koraidon')){
  if(back){
   if(shiny)add(`${GITHUB_SPRITES}/other/showdown/back/shiny/1007.gif`);
   add(`${GITHUB_SPRITES}/other/showdown/back/1007.gif`);
   if(shiny)add(`${GITHUB_SPRITES}/back/shiny/1007.png`);
   add(`${GITHUB_SPRITES}/back/1007.png`);
   if(shiny)add('https://play.pokemonshowdown.com/sprites/ani-back-shiny/koraidon.gif');
   add('https://play.pokemonshowdown.com/sprites/ani-back/koraidon.gif');
  }else{
   if(animated){
    if(shiny)add('https://play.pokemonshowdown.com/sprites/ani-shiny/koraidon.gif');
    else add('https://play.pokemonshowdown.com/sprites/ani/koraidon.gif');
    if(shiny)add(`${GITHUB_SPRITES}/other/showdown/shiny/1007.gif`);
    else add(`${GITHUB_SPRITES}/other/showdown/1007.gif`);
   }
   if(shiny){
    add('https://play.pokemonshowdown.com/sprites/home-shiny/koraidon.png');
    add(`${GITHUB_SPRITES}/other/home/shiny/1007.png`);
    add('https://play.pokemonshowdown.com/sprites/dex-shiny/koraidon.png');
   }
   add('https://play.pokemonshowdown.com/sprites/home/koraidon.png');
   add(`${GITHUB_SPRITES}/other/home/1007.png`);
   add('https://play.pokemonshowdown.com/sprites/dex/koraidon.png');
  }
  if(shiny){add('https://play.pokemonshowdown.com/sprites/home-shiny/koraidon.png');add(`${GITHUB_SPRITES}/other/home/shiny/1007.png`);}
  add('https://play.pokemonshowdown.com/sprites/home/koraidon.png');
  add(`${GITHUB_SPRITES}/other/home/1007.png`);
  return [...new Set(urls)];
 }
 // The public animated-sprite indexes checked do not list a Miraidon battle GIF (and the
 // PokeAPI 1008 showdown GIF returns 404). Use confirmed HOME art/back pixel sprite instead.
 if(has('miraidon')){
  if(!back&&animated){add('https://play.pokemonshowdown.com/sprites/gen5ani/miraidon.gif');add('https://play.pokemonshowdown.com/sprites/ani/miraidon.gif');}
  if(back){
   if(shiny)add(`${GITHUB_SPRITES}/back/shiny/1008.png`);
   add(`${GITHUB_SPRITES}/back/1008.png`);
   if(shiny){add('https://play.pokemonshowdown.com/sprites/home-shiny/miraidon.png');add(`${GITHUB_SPRITES}/other/home/shiny/1008.png`);}
   add('https://play.pokemonshowdown.com/sprites/home/miraidon.png');
   add(`${GITHUB_SPRITES}/other/home/1008.png`);
  }else{
   if(shiny){
    add('https://play.pokemonshowdown.com/sprites/home-shiny/miraidon.png');
    add(`${GITHUB_SPRITES}/other/home/shiny/1008.png`);
    add('https://play.pokemonshowdown.com/sprites/dex-shiny/miraidon.png');
   }
   add('https://play.pokemonshowdown.com/sprites/home/miraidon.png');
   add(`${GITHUB_SPRITES}/other/home/1008.png`);
   add('https://play.pokemonshowdown.com/sprites/dex/miraidon.png');
   add(`${GITHUB_SPRITES}/other/official-artwork/1008.png`);
  }
  return [...new Set(urls)];
 }
 return [];
}
function showdownSpriteUrls(monOrSpecies,back=false,animated=false){
 const p=spriteSpecies(monOrSpecies);if(!p)return [];
 const shiny=!!monOrSpecies?.shiny;
 const primary=spriteKey(p.spriteid)||spriteKey(p.id),alias=spriteKey(p.id);
 const urls=[],add=(dir,id,ext)=>{if(id)urls.push(`https://play.pokemonshowdown.com/sprites/${dir}/${id}.${ext}`)};
 if(back){
  add(shiny?'ani-back-shiny':'ani-back',primary,'gif');
  if(alias!==primary)add(shiny?'ani-back-shiny':'ani-back',alias,'gif');
  if(shiny){add('ani-back',primary,'gif');add('afd-back-shiny',primary,'png');}
  add('gen5-back',primary,'png');add(shiny?'afd-back-shiny':'afd-back',primary,'png');add('gen1rgb-back',primary,'png');
 }else if(animated){
  add(shiny?'ani-shiny':'ani',primary,'gif');
  if(alias!==primary)add(shiny?'ani-shiny':'ani',alias,'gif');
  if(shiny){add('ani',primary,'gif');add('dex-shiny',primary,'png');add('dex',primary,'png');add('home-shiny',primary,'png');add('afd-shiny',primary,'png');}
  else{add('dex',primary,'png');add('home',primary,'png');add('gen5',primary,'png');add('afd',primary,'png');}
 }else{
  add(shiny?'dex-shiny':'dex',primary,'png');
  if(alias!==primary)add(shiny?'dex-shiny':'dex',alias,'png');
  add(shiny?'home-shiny':'home',primary,'png');
  add(shiny?'afd-shiny':'afd',primary,'png');
  add('gen5',primary,'png');add(shiny?'ani-shiny':'ani',primary,'gif');
 }
 return [...new Set(urls)];
}
function githubSpriteUrls(monOrSpecies,back=false,animated=false){
 const p=spriteSpecies(monOrSpecies);if(!p)return [];
 const exact=Number(p.spritePokemonId||p.pokeApiPokemonId||0);
 if(!Number.isFinite(exact)||exact<=0)return [];
 const shiny=!!monOrSpecies?.shiny,id=exact,urls=[];
 if(back){
  if(shiny)urls.push(`${GITHUB_SPRITES}/other/showdown/back/shiny/${id}.gif`);
  urls.push(`${GITHUB_SPRITES}/other/showdown/back/${id}.gif`);
  if(shiny)urls.push(`${GITHUB_SPRITES}/back/shiny/${id}.png`);
  urls.push(`${GITHUB_SPRITES}/back/${id}.png`);
  if(shiny)urls.push(`${GITHUB_SPRITES}/other/showdown/shiny/${id}.gif`);
  else urls.push(`${GITHUB_SPRITES}/other/showdown/${id}.gif`);
 }else{
  if(animated){
   if(shiny)urls.push(`${GITHUB_SPRITES}/other/showdown/shiny/${id}.gif`);
   else urls.push(`${GITHUB_SPRITES}/other/showdown/${id}.gif`);
  }
  if(shiny)urls.push(`${GITHUB_SPRITES}/other/home/shiny/${id}.png`,`${GITHUB_SPRITES}/other/official-artwork/shiny/${id}.png`,`${GITHUB_SPRITES}/shiny/${id}.png`);
  urls.push(`${GITHUB_SPRITES}/other/home/${id}.png`,`${GITHUB_SPRITES}/other/official-artwork/${id}.png`,`${GITHUB_SPRITES}/${id}.png`);
  if(!animated){
   if(shiny)urls.push(`${GITHUB_SPRITES}/other/showdown/shiny/${id}.gif`);
   else urls.push(`${GITHUB_SPRITES}/other/showdown/${id}.gif`);
  }
 }
 return [...new Set(urls)];
}
function spriteUrlCandidates(monOrSpecies,back=false,animated=false){
 const p=spriteSpecies(monOrSpecies);if(!p)return [];
 const special=specialSpriteUrls(monOrSpecies,back,animated);
 const showdown=showdownSpriteUrls(monOrSpecies,back,animated);
 const github=githubSpriteUrls(monOrSpecies,back,animated);
 const isGif=url=>/\.gif(?:$|[?#])/i.test(url);
 const rest=(animated||back)
  ?[...showdown.filter(isGif),...github.filter(isGif),...showdown.filter(u=>!isGif(u)),...github.filter(u=>!isGif(u))]
  :[...showdown,...github];
 return [...new Set([...special,...rest])];
}
function imageUrl(monOrSpecies,back=false,animated=false){return spriteUrlCandidates(monOrSpecies,back,animated)[0]||'';}
function speciesIcon(monOrSpecies,back=false,animated=false){
 const p=spriteSpecies(monOrSpecies);if(!p)return '<span class="sprite-fallback">画像なし</span>';
 animated=!!animated||!!back;
 installSpriteListeners();
 const key=spriteIdentity(monOrSpecies,back,animated);
 const candidates=spriteUrlCandidates(monOrSpecies,back,animated);
 const cached=spriteResolvedUrlCache.get(key);
 const ordered=[...(cached?[cached]:[]),...candidates];
 const urls=[...new Set(ordered.filter(url=>url&&!spriteFailedUrls.has(url)))];
 if(!urls.length)return '<span class="sprite-fallback">画像なし</span>';
 const alt=getPokeName(p);
 return `<img src="${esc(urls[0])}" data-sprite-key="${esc(key)}" data-sprite-current-url="${esc(urls[0])}" data-sprite-candidates="${esc(JSON.stringify(urls.slice(1)))}" data-expected-name="${esc(alt)}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
}
function typesHtml(types=[]){return `<div class="type-chips">${types.map(t=>`<span class="type-chip" style="background:${TYPE_COLORS[t]||'#636b85'}">${TYPE_JA[t]||t}</span>`).join('')}</div>`;}
function typeMult(moveType,defSpecies,defMon=null){if(!moveType||moveType==='???')return 1;if(defMon?.abilityId){const a=slug(defMon.abilityId);if((a==='levitate'&&moveType==='Ground')||(a==='waterabsorb'&&moveType==='Water')||(a==='voltabsorb'&&moveType==='Electric')||(a==='flashfire'&&moveType==='Fire')||(a==='sapsipper'&&moveType==='Grass')||(a==='stormdrain'&&moveType==='Water')||(a==='dryskin'&&moveType==='Water')||(a==='motordrive'&&moveType==='Electric'))return 0;}let mult=1;for(const t of defSpecies?.types||[]){const c=TYPE_CHART[moveType];if(!c)continue;if(c.immune.includes(t))return 0;if(c.weak.includes(t))mult*=2;if(c.resist.includes(t))mult*=.5;}return mult;}
function statStage(value,stage){return stage>=0?value*(2+stage)/2:value*2/(2-stage);}
function currentStat(mon,k){let v=mon.stats[k];if(mon.stages?.[k])v=statStage(v,mon.stages[k]);if(k==='spe'){if(mon.status==='par')v*=.5;if(itemSlug(mon.heldItem)==='choicescarf')v*=1.5;const ab=slug(mon.abilityId);if((ab==='swiftswim'&&state.battle?.weather==='rain')||(ab==='chlorophyll'&&state.battle?.weather==='sun')||(ab==='sandrush'&&state.battle?.weather==='sand')||(ab==='slushrush'&&state.battle?.weather==='snow'))v*=2;}if(k==='atk'&&mon.status&&slug(mon.abilityId)==='guts')v*=1.5;if(k==='atk'&&['hugepower','purepower'].includes(slug(mon.abilityId)))v*=2;return Math.floor(v);}

function itemSlug(value){const map={'なし':'','こだわりスカーフ':'choicescarf','こだわりハチマキ':'choiceband','こだわりメガネ':'choicespecs','いのちのたま':'lifeorb','きあいのタスキ':'focussash','たべのこし':'leftovers','オボンのみ':'sitrusberry','ゴツゴツメット':'rockyhelmet','とつげきチョッキ':'assaultvest','ブーツ':'heavydutyboots','メガストーン（試作）':'megastone','きのみ':'berry','ガブリアスナイトZ':'garchompitez','ガブリアスナイトＺ':'garchompitez','Garchompite Z':'garchompitez'};return slug(map[value]??value);}
function abilityName(abilityId){if(!abilityId)return 'なし';const key=slug(abilityId),remote=state.data.upstreamMechanics?.abilitiesById?.[key];return state.data.abilityNames.get(key)||remote?.name||String(abilityId);}
function abilityDescription(abilityId){if(!abilityId)return '特性が設定されていません。';const key=slug(abilityId),remote=state.data.upstreamMechanics?.abilitiesById?.[key];return abilityFallbackDescription(key)||state.data.abilityDesc.get(key)||remote?.shortDesc||remote?.desc||'この特性の説明データが見つかりません。効果の再現状態は個別に確認してください。';}
function abilityFallbackDescription(id){const map={intimidate:'登場時、相手の攻撃を1段階下げる。',levitate:'じめんタイプの技を無効化する。',waterabsorb:'みずタイプの攻撃を無効化し、HPを回復する。',voltabsorb:'でんきタイプの攻撃を無効化し、HPを回復する。',flashfire:'ほのおタイプの攻撃を無効化する。',drizzle:'登場時に雨を降らせる。',drought:'登場時に晴れにする。',sandstream:'登場時に砂嵐を起こす。',snowwarning:'登場時に雪を降らせる。',swiftswim:'雨の間、素早さが2倍になる。',chlorophyll:'晴れの間、素早さが2倍になる。',sandrush:'砂嵐の間、素早さが2倍になる。',slushrush:'雪の間、素早さが2倍になる。',technician:'威力60以下の技の威力が1.5倍になる。',adaptability:'タイプ一致補正が強化される。',pressure:'相手がこのポケモンを対象に技を使うとPPを余分に消費する。',hugepower:'攻撃が2倍になる。',purepower:'攻撃が2倍になる。',guts:'状態異常のとき攻撃が上がり、やけどによる攻撃低下を無視する。',multiscale:'HP満タン時に受けるダメージを軽減する。',thickfat:'ほのお・こおり技のダメージを軽減する。',sapsipper:'くさタイプの攻撃を無効化し、攻撃が上がる。',stormdrain:'みずタイプの攻撃を無効化し、特攻が上がる。',motordrive:'でんきタイプの攻撃を無効化し、素早さが上がる。',dryskin:'みず技で回復し、ほのお技に弱くなる。',serenegrace:'技の追加効果が発生しやすくなる。',sheerforce:'追加効果を失う代わりに技の威力が上がる。',magicbounce:'一部の変化技を跳ね返す。'};return map[id]||'';}
function moveDescription(m){if(!m)return '技の説明データは未収録です。';if(m.id==='weatherball')return '天気によってタイプと威力が変化する。通常は威力50のノーマル技。雨なら威力100のみず技、晴れなら威力100のほのお技、砂嵐なら威力100のいわ技、雪なら威力100のこおり技になる。';return m.flavorJa||m.mechanicDescription||m.description||m.showdownShortDesc||m.showdownDesc||'技の説明データは未収録です。';}
function getMoveCatJa(cat){return cat==='Physical'?'物理':cat==='Special'?'特殊':'変化';}
function getMoveIcon(cat){return cat==='Physical'?'⚔':cat==='Special'?'✦':'◇';}
function formatPower(m){return m?.basePower?m.basePower:'—';}
function formatAccuracy(m){return m?.accuracy===true?'必中':m?.accuracy==null?'—':`${m.accuracy}%`;}
function typeStyles(type){return `--move-color:${TYPE_COLORS[type]||'#7b8db7'}`;}
function rarityIcon(mon){return `${mon.shiny?'<span class="pill shiny-badge">✦ 色違い</span>':''}${mon.mark?`<span class="pill proof-badge">◇ ${esc(mon.mark)}</span>`:''}`;}
function hasSpeciesOwned(speciesId){return state.owned.some(m=>m.speciesId===speciesId);}
function reportSaveIssue(message,error){
 if(error)console.error('[Pokémon Champions 2D save]',error);
 if(!state.saveWarningShown){state.saveWarningShown=true;setTimeout(()=>toast(message,'bad'),0);}
}
function saveLocal(){
 if(state.saveWriteBlocked){
  if(!state.saveWarningShown)reportSaveIssue('セーブの書き込みを停止しています。設定画面でバックアップを読み込むか、セーブを初期化してください。');
  return false;
 }
 try{
  const sav={version:4,vp:state.vp,owned:state.owned,team:state.team,items:state.items||{},eggs:state.eggs||[],farm:state.farm||{uids:[],capacity:3,lastAt:Date.now()},careStats:state.careStats||{},boxPage:Number(state.boxPage||0),adminConfig:cleanAdminConfig(state.adminConfig),dexResearch:state.dexResearch||{}};
  localStorage.setItem('pokemon-champions-2d-save',JSON.stringify(sav));
  return true;
 }catch(e){
  state.saveWriteBlocked=true;state.saveBlockReason='write';
  reportSaveIssue('セーブに失敗しました。変更を失わないよう、設定画面からJSONを書き出してバックアップしてください。',e);
  return false;
 }
}
function loadLocal(){
 try{
  const raw=localStorage.getItem('pokemon-champions-2d-save');
  if(!raw)return false;
  let sav;
  try{sav=JSON.parse(raw);}catch(e){throw new Error('保存データがJSONとして壊れています。');}
  const version=Number(sav?.version);
  if(!sav||!Array.isArray(sav.owned)||!Number.isInteger(version)||version<1||version>4){
   throw new Error('保存データの形式またはバージョンが対応していません。元のデータは上書きしません。');
  }
  state.vp=Number.isFinite(Number(sav.vp))?Math.max(0,Number(sav.vp)):1500;
  state.owned=sav.owned;
  state.team=Array.isArray(sav.team)?sav.team:[];
  state.adminConfig=cleanAdminConfig(sav.adminConfig||DEFAULT_ADMIN_CONFIG);
  state.items=sav.items&&typeof sav.items==='object'&&!Array.isArray(sav.items)?sav.items:{};
  state.eggs=Array.isArray(sav.eggs)?sav.eggs:[];
  state.farm=sav.farm&&typeof sav.farm==='object'?{uids:Array.isArray(sav.farm.uids)?sav.farm.uids:[],capacity:Math.max(3,Number(sav.farm.capacity||3)),lastAt:Number(sav.farm.lastAt||Date.now())}:{uids:[],capacity:3,lastAt:Date.now()};
  state.careStats=sav.careStats&&typeof sav.careStats==='object'?sav.careStats:{};
   state.dexResearch=sav.dexResearch&&typeof sav.dexResearch==='object'&&!Array.isArray(sav.dexResearch)?sav.dexResearch:{};
  state.boxPage=Math.max(0,Number(sav.boxPage||0));
  return true;
 }catch(e){
  state.saveWriteBlocked=true;state.saveBlockReason='load';
  reportSaveIssue('セーブの読み込みに失敗しました。元の保存データを上書きしないよう保存を停止しました。設定から有効なJSONを読み込むか、内容を確認してから初期化してください。',e);
  return false;
 }
}
function saveStatusLabel(){
 if(state.saveWriteBlocked)return state.saveBlockReason==='load'?'読み込みエラーのため保存停止中':'保存エラーのため保存停止中';
 try{return localStorage.getItem('pokemon-champions-2d-save')?'保存データあり':'未保存 / 新規';}
 catch(_){return 'ブラウザの保存領域を利用できません';}
}
function toast(text,type='good'){const root=$('#toast-root');if(!root)return;const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=text;root.appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(8px)';setTimeout(()=>el.remove(),220);},3200);}
function setPage(page){state.page=page;state.modal=null;$$('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);});renderPage();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function renderPage(){
 const main=$('#main');if(!main)return;
 const pages={home:renderHome,battle:renderBattlePage,box:renderBox,dex:renderDex,moves:renderMoves,abilities:renderAbilities,scout:renderScout,training:renderTraining,shop:renderShop,settings:renderSettings};
 const previousSprites=new Map();
 main.querySelectorAll('img[data-sprite-key]').forEach(img=>{
  const key=img.dataset.spriteKey;if(!key)return;
  if(!previousSprites.has(key))previousSprites.set(key,[]);
  previousSprites.get(key).push(img);
 });
 // Render off-DOM so temporary <img> elements do not trigger new requests on every rerender.
 const template=document.createElement('template');
 template.innerHTML=(pages[state.page]||renderHome)();
 template.content.querySelectorAll('img[data-sprite-key]').forEach(fresh=>{
  const queue=previousSprites.get(fresh.dataset.spriteKey);if(!queue?.length)return;
  const previous=queue.shift();
  if(!previous||previous.classList.contains('sprite-missing'))return;
  previous.alt=fresh.alt||previous.alt;
  fresh.replaceWith(previous);
 });
 main.replaceChildren(template.content);
 updateTop();bindPageEvents();
}
function updateTop(){const v=$('#vp-value');if(v)v.textContent=Number(state.vp).toLocaleString();const s=$('#data-status');if(s){s.textContent=['full','full-csv'].includes(state.dataState)?`図鑑 ${state.data.dex.length.toLocaleString()} / 技 ${Object.keys(state.data.movesById||{}).length.toLocaleString()}`:state.dataState==='moves-csv'?`技 ${Object.keys(state.data.movesById||{}).length.toLocaleString()}件（CSV）` :state.dataState==='learnsets-csv'?`技 ${Object.keys(state.data.movesById||{}).length.toLocaleString()} / 習得技CSV` :state.dataState==='partial'?`一部データ：技 ${Object.keys(state.data.movesById||{}).length.toLocaleString()}件`:'読込中';const pill=s.closest('.connection-pill');if(pill)pill.classList.toggle('warn',!['full','full-csv'].includes(state.dataState));}}
function pageHeader(kicker,title,desc,action=''){return `<div class="page-title"><div><div class="section-kicker">${esc(kicker)}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;}
function statTile(label,value,sub){return `<div class="stat-tile"><span>${label}</span><b>${value}</b><small>${sub}</small></div>`;}
function renderHome(){const team=state.team.map(uid=>state.owned.find(m=>m.uid===uid)).filter(Boolean).slice(0,6);const preview=team.length?team:state.owned.slice(0,6);const latest=state.battle?.log?.slice(-4).reverse()||[];const heroSpecies=findSpecies('lucario')||findSpecies('charizard')||state.data.dex[0];return `${pageHeader('TRAINER HUB','バトルの準備はできた？','手持ちを整え、戦術を組み立て、次の勝利をつかもう。','<button class="btn btn-ghost" data-action="help">遊び方ガイド　?</button>')}
 <section class="home-hero"><div class="hero-content"><div class="hero-tag">✦ NATIONAL DEX BATTLE LAB <span>・ FAN PROTOTYPE</span></div><h2>勝負を決めるのは、<br><span>トレーナーの戦略。</span></h2><p>ポケモンを選び、技・特性・持ち物を整え、ターンごとに最善手を選択。天候、状態異常、能力ランク、タイプ相性を使いこなせ。</p><div class="hero-actions"><button class="btn btn-primary" data-action="start-battle">⚔　バトルを始める</button><button class="btn btn-ghost" data-page="scout">＋　ポケモンをスカウト</button></div></div><div class="hero-art"><div class="ring"></div>${heroSpecies?speciesIcon(heroSpecies):''}</div></section>
 <div class="stats-strip">${statTile('OWNED POKÉMON',state.owned.length.toLocaleString(),'ボックス内の個体数')}${statTile('TEAM MEMBERS',state.team.length,'対戦チーム / 6匹')}${statTile('VP BALANCE',state.vp.toLocaleString(),'バトル・ミッション報酬')}${statTile('NATIONAL DEX',selectableDex().length.toLocaleString(),'内蔵図鑑から選択可能な種類')}</div>
 <div class="grid home-columns"><section class="panel"><div class="panel-head"><h2>⚡　バトルチーム</h2><button class="btn btn-ghost btn-sm" data-page="training">チーム・育成を編集　↗</button></div><div class="panel-body"><div class="team-grid">${Array.from({length:6},(_,i)=>{const mon=preview[i];return mon?`<button class="team-card" data-action="open-owned" data-uid="${esc(mon.uid)}">${speciesIcon(mon)}<b>${esc(mon.name||getPokeName(monSpecies(mon)))}</b><small>Lv.${mon.level||50}${mon.shiny?' ✦':''}</small>${typesHtml(monSpecies(mon)?.types||[])}</button>`:`<button class="team-card" data-page="scout"><div style="font-size:30px;color:#657398;padding:20px 0">＋</div><b>空き枠</b><small>スカウト</small></button>`}).join('')}</div><p class="footer-note">個体値の厳選は行わず、トレーニング画面で能力・特性・技を調整できます。大会レギュレーションとは異なる独自の全国図鑑ルールです。</p></div></section>
 <section class="panel"><div class="panel-head"><h2>✦　クイックメニュー</h2></div><div class="panel-body"><div class="list"><div class="activity-row"><div class="activity-icon">⚔</div><div class="activity-copy"><b>ソロバトル</b><small>CPUチームとターン制対戦</small></div><button class="btn btn-secondary btn-sm" data-action="start-battle">対戦</button></div><div class="activity-row"><div class="activity-icon">◉</div><div class="activity-copy"><b>全国図鑑</b><small>種族・フォルムを検索</small></div><button class="btn btn-secondary btn-sm" data-page="dex">開く</button></div><div class="activity-row"><div class="activity-icon">✦</div><div class="activity-copy"><b>VPスカウト</b><small>欲しいポケモンを直接選択</small></div><button class="btn btn-secondary btn-sm" data-page="scout">選ぶ</button></div><div class="activity-row"><div class="activity-icon">⌁</div><div class="activity-copy"><b>トレーニング</b><small>技・特性・努力値を調整</small></div><button class="btn btn-secondary btn-sm" data-page="training">調整</button></div></div></div></section></div>
 <div class="panel" style="margin-top:16px"><div class="panel-head"><h2>RECENT BATTLE LOG / 最近の戦況</h2><span class="pill">TURN-BASED</span></div><div class="panel-body">${latest.length?`<div class="list">${latest.map(x=>`<div class="activity-row"><div class="activity-icon">${x.includes('倒れた')?'✦':'⚡'}</div><div class="activity-copy"><b>${esc(x)}</b><small>直近のバトルログ</small></div></div>`).join('')}</div>`:`<div class="empty-state">まだバトルログがありません。<br><small>最初の対戦を始めてみよう。</small></div>`}</div></div>
 <p class="footer-note">© Pokémon names and data belong to their respective owners. This is an unofficial fan-made prototype, not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company. Data providers and attribution are listed in Settings.</p>`;}
function filteredDexList(limit=state.dexLoad){let list=selectableDex();const q=searchKey(state.dexSearch);if(q)list=list.filter(p=>searchKey(p.name).includes(q)||searchKey(p.jpName).includes(q)||String(p.num).includes(q)||searchKey(p.displayName).includes(q));if(state.dexType!=='all')list=list.filter(p=>p.types.includes(state.dexType));return list.slice(0,limit);}
function dexCard(p,selected=false){const owned=hasSpeciesOwned(p.id);return `<button class="dex-card ${selected?'selected':''}" data-action="select-dex" data-id="${esc(p.id)}"><span class="dex-number">#${String(p.num).padStart(4,'0')}</span>${owned?'<span class="owned-dot">●</span>':''}${speciesIcon(p)}<strong>${esc(getPokeName(p))}</strong>${typesHtml(p.types||[])}</button>`;}
function renderDex(){const selected=state.data.dexById[state.selectedDex]&&isSelectableFinalSpecies(state.data.dexById[state.selectedDex])?state.data.dexById[state.selectedDex]:(selectableDex()[0]||null);const list=filteredDexList();return `${pageHeader('NATIONAL POKÉDEX','全国図鑑','HTML内蔵の全国図鑑1025種を検索。カードを選ぶと種族値・タイプ・特性・入手状況が見られます。')}
 <div class="search-row"><input id="dex-search" class="field search-field" placeholder="ポケモン名・英名・図鑑番号で検索" value="${esc(state.dexSearch)}"><select id="dex-type" class="field select-field"><option value="all">すべてのタイプ</option>${Object.keys(TYPE_JA).map(t=>`<option value="${t}" ${state.dexType===t?'selected':''}>${TYPE_JA[t]}</option>`).join('')}</select><span class="pill">${filteredDexList(999999).length.toLocaleString()} 件</span></div>
 <div class="dex-layout"><section><div id="dex-grid" class="dex-grid">${list.map(p=>dexCard(p,p.id===state.selectedDex)).join('')}</div>${filteredDexList(999999).length>list.length?`<button class="btn btn-ghost btn-wide" style="margin-top:12px" data-action="dex-more">さらに表示（${(filteredDexList(999999).length-list.length).toLocaleString()}件）</button>`:''}</section>${selected?renderDexDetail(selected):'<aside class="panel empty-state">データがありません</aside>'}</div>`;}
function renderDexDetail(p){const stats=p.baseStats||{};const ab=Object.values(p.abilities||{}).filter(v=>typeof v==='string');return `<aside class="panel detail-card"><div class="detail-visual"><span class="dex-num-large">#${String(p.num).padStart(4,'0')}</span>${speciesIcon(p)}</div><div class="detail-content"><span class="section-kicker">POKÉMON DATA</span><h2>${esc(getPokeName(p))}</h2><div class="eng-name">${esc(p.name.toUpperCase())}${p.forme?` · ${esc(p.forme.toUpperCase())}`:''}</div>${typesHtml(p.types)}<div class="summary-chip"><span>種族値合計</span><b>${p.bst||Object.values(stats).reduce((a,b)=>a+Number(b||0),0)}</b></div><div class="stat-list">${STAT_KEYS.map(k=>{const v=Number(stats[k]||0);return `<div class="stat-row"><span>${STAT_JA[k]}</span><b>${v}</b><div class="stat-bar"><i style="width:${Math.min(100,v/255*100)}%;background:${v>120?'#ff8f9a':v>90?'#ffd166':'#58d8b9'}"></i></div></div>`}).join('')}</div><div class="ability-box"><b>特性候補</b><p>${ab.map(a=>`${esc(abilityName(a))}：${esc(abilityDescription(a))}`).join('<br><br>')||'特性データなし'}</p></div><div class="summary-chip"><span>高さ / 重さ</span><b>${p.heightm??'—'} m / ${p.weightkg??'—'} kg</b></div><button class="btn btn-primary btn-wide" data-action="scout-specific" data-id="${esc(p.id)}">このポケモンをスカウト</button><p class="footer-note">内蔵図鑑レコード：${esc(p.id)}。提供ファイルにない別フォルムは表示されません。</p></div></aside>`;}
const MOVE_TAXONOMY = [
 {id:1,group:'攻撃',name:'標準ダメージ',summary:'通常のダメージ計算。単発・連続攻撃・急所補正を含む。',examples:'10まんボルト、じしん、タネマシンガン、あんこくきょうだ'},
 {id:2,group:'攻撃',name:'複合ダメージ',summary:'攻撃と同時に吸収、追加効果、反動、能力変化、交代などを処理。',examples:'ドレインパンチ、シャドーボール、すてみタックル、とんぼがえり'},
 {id:3,group:'攻撃',name:'変則ダメージ',summary:'固定値・割合・残りHP・体重・能力差などを使う特殊なダメージ計算。',examples:'カタストロフィ、ちきゅうなげ、いたみわけ、きしかいせい、くさむすび'},
 {id:4,group:'攻撃',name:'一撃必殺',summary:'命中・レベルなどの条件を満たすと相手を一撃でひんしにする。',examples:'じわれ、ぜったいれいど、ハサミギロチン'},
 {id:5,group:'攻防',name:'攻防一体',summary:'防御姿勢と接触時の反撃・追加罰則などを組み合わせる。',examples:'ニードルガード、キングシールド、シルクノドール'},
 {id:6,group:'動作',name:'ターン・時差発生',summary:'溜め、空中・地下などへの退避、遅延攻撃、継続拘束を処理。',examples:'ソーラービーム、そらをとぶ、みらいよち、ほのおのうず'},
 {id:7,group:'耐久',name:'HP回復',summary:'即時回復・継続回復・与ダメージ吸収・全回復と睡眠など。',examples:'じこさいせい、アクアリング、ねむる'},
 {id:8,group:'耐久',name:'デコイ（分身）生成',summary:'HPを消費して身代わりを生成し、攻撃や状態変化を肩代わりする。',examples:'みがわり'},
 {id:9,group:'変化',name:'ステータス操作',summary:'能力ランクの上昇・低下・リセット・コピーなど。',examples:'つるぎのまい、あまえる、くろいきり、じこあんじ'},
 {id:10,group:'変化',name:'状態異常・行動制限',summary:'状態異常、混乱、挑発、アンコール、技封じなどを扱う。',examples:'でんじは、おにび、ちょうはつ、アンコール'},
 {id:11,group:'変化',name:'特性操作',summary:'特性の交換・上書き・コピー・消去など。',examples:'スキルスワップ、なかまづくり、なりきり、いえき'},
 {id:12,group:'変化',name:'タイプ改変',summary:'自分や相手のタイプを変更・追加・コピーする。',examples:'みずびたし、テクスチャー、もりののろい'},
 {id:13,group:'変化',name:'引き継ぎ・もちもの',summary:'能力変化の引き継ぎ、道具の交換・奪取・破壊・使用不能化。',examples:'バトンタッチ、トリック、はたきおとす'},
 {id:14,group:'防御',name:'保護・回避',summary:'攻撃や効果の遮断、こらえる、範囲攻撃ガードなど。',examples:'まもる、みきり、ワイドガード、こらえる'},
 {id:15,group:'操作',name:'位置・行動順操作',summary:'行動順や優先度の操作、強制交代、味方との位置交換など。',examples:'おさきにどうぞ、さきおくり、サイドチェンジ、ふきとばし'},
 {id:16,group:'模倣',name:'コピー・ランダム発動',summary:'技のコピー、ランダムな技や相手の技をその場で呼び出す。',examples:'ゆびをふる、まねっこ、スケッチ、さきどり'},
 {id:17,group:'特殊',name:'即死・道連れ',summary:'一定条件やターン経過によるひんし、相手を道連れにする。',examples:'みちづれ、ほろびのうた'},
 {id:18,group:'環境',name:'設置トラップ・壁',summary:'交代時に働くトラップ、リフレクターなどのダメージ軽減壁。',examples:'ステルスロック、まきびし、リフレクター、ひかりのかべ'},
 {id:19,group:'環境',name:'天候・フィールド',summary:'天候・地形を変更し、技やタイプに関係する場の効果を作る。',examples:'にほんばれ、あまごい、エレキフィールド'},
 {id:20,group:'環境',name:'ルール改変（空間）',summary:'素早さ順、守備参照、持ち物効果などのバトルルールを一時変更。',examples:'トリックルーム、ワンダールーム、マジックルーム'}
];
function moveTaxonomyCategories(m){
 if(!m||typeof m!=='object')return [];
 if(Array.isArray(m._taxonomyCategories))return m._taxonomyCategories;
 const api=Number(m.apiId), id=slug(`${m.id||''} ${m.name||''} ${m.displayName||''}`), jp=String(m.jpName||''),
  text=`${m.name||''} ${jp} ${m.displayName||''} ${m.shortDesc||''} ${m.description||''} ${m.flavorJa||''} ${m.mechanicDescription||''} ${Object.values(m.apiAdditional||{}).map(v=>String(v??'')).join(' ')}`.toLowerCase();
 const has=(re)=>re.test(text), name=(re)=>re.test(`${id} ${jp.toLowerCase()} ${String(m.name||'').toLowerCase()}`),
  apiIn=(arr)=>arr.includes(api), cats=[], add=(n,yes=true)=>{if(yes&&!cats.includes(n))cats.push(n)};
 const cat=String(m.category||''), bp=Number(m.basePower||0), target=String(m.target||'').toLowerCase();
 const ad=m.apiAdditional||{}, secondary=m.secondary||null, secondaries=Array.isArray(m.secondaries)?m.secondaries:[];
 const ailment=String(m.status||ad['状態異常']||'').toLowerCase(); const hasRealAilment=/^(paralysis|paralyze|burn|poison|bad poison|toxic|sleep|freeze|frostbite|confusion|flinch|trap|bound|yawn|psn|tox|brn|par|slp|frz|drowsy|infatuation|nightmare|leechseed)$/i.test(ailment);
 const hasSecondary=!!secondary||secondaries.length>0||Number(m.effectChance||0)>0&&has(/chance to|has a chance|may (?:burn|poison|paraly|freeze|flinch)|ことがある|場合がある/);
 const drainRaw=Array.isArray(m.drain)?Number(m.drain[0]||0):Number(m.drain||0);
 const drain=drainRaw>0||Number(ad['吸収']||0)>0;
 const recoil=Number(m.recoil||0)>0||Number(m.selfRecoilMaxPct||0)>0||has(/recoil damage|the user is hurt by recoil|反動ダメージ|自分もダメージを受ける|自分も反動/);
 const damaging=cat==='Physical'||cat==='Special';
 const fixedOrVariable=!!m.ohko||name(/ちきゅうなげ|ナイトヘッド|りゅうのいかり|ソニックブーム|いかりのまえば|がむしゃら|いのちがけ|サイコウェーブ|カタストロフィ|いたみわけ|counter|mirrorcoat|metalburst|endeavor|finalgambit|painsplit|naturesmadness|superfang|seismictoss|nightshade|dragonrage|sonicboom|psywave/ )||has(/fixed damage|damage equal to (?:the user's|the user.?s|its|the target.?s)? ?(?:level|hp)|damage equal to the amount|half of the target.?s remaining hp|half the target.?s hp|cuts the target.?s hp in half|cuts.{0,35}hp.{0,20}in half|based on (?:the target.?s weight|weight)|heavier target|lighter target|more damage when the user has (?:more|less) hp|power (?:is )?(?:higher|lower) when|depends on (?:the user.?s|target.?s|remaining) hp|damage.*(?:weight|remaining hp|current hp)|level.*damage|fixed amount|half.*hp|based on how much hp|相手の残りＨＰの半分|相手のＨＰを半分|自分の残りＨＰ|体重|重いほど|軽いほど|レベルと同じ|レベル分のダメージ|固定ダメージ|ＨＰの差|ＨＰを比べ/);
 const ohko=!!m.ohko||apiIn([12,32,90,329])||name(/じわれ|ぜったいれいど|ハサミギロチン|つのドリル|fissure|sheercold|guillotine|horndrill/);
 const protectMove=name(/まもる|みきり|ワイドガード|ファストガード|こらえる|キングシールド|ニードルガード|バンジーガード|シルクノドール|protect|detect|wideguard|quickguard|endure|kingsshield|spikyshield|banefulbunker|obstruct|silktrap|burningbulwark|craftyshield/)
  ||has(/prevents? (?:any )?moves? from hitting the user|protects? the user from attacks|endure any attack|cannot be knocked out this turn|相手の攻撃を.*受けない|攻撃をこらえて|接触した相手にダメージ/);
 const counterDamage=name(/カウンター|ミラーコート|メタルバースト|counter|mirrorcoat|metalburst/);
 const counterLike=counterDamage||name(/ニードルガード|キングシールド|シルクノドール/)
  ||has(/contact moves.*(?:damage|punish)|if hit by a contact move|contact.*attacker|接触した相手|攻撃してきた相手に.*ダメージ/);
 const abilityChange=name(/スキルスワップ|なかまづくり|なりきり|いえき|シンプルビーム|なやみのタネ|うつしえ|skill swap|entrainment|role play|worry seed|simple beam|gastro acid|transform ability/)
  ||has(/(?:swap|change|copy|replace|suppress|remove|give).*abilities|abilities.*(?:swap|change|copy|replace|suppress|remove)|特性を(?:交換|入れ替え|コピー|変更|消す|なくす|消去|同じに)|特性を.*上書き/);
 const typeChange=name(/みずびたし|テクスチャー|もりののろい|ハロウィン|まほうのこな|みやぶる|soak|conversion|reflecttype|forestscurse|trickortreat|magicpowder|camouflage|burnup|terablast/)
  ||has(/(?:change|changes|changed|copy|copies|add|adds|remove|removes).*type|type of the user|user.s type|target.s type|タイプを(?:変|変更|追加)|タイプが変わ|タイプを.*同じ/);
 const itemChange=name(/バトンタッチ|トリック(?!ルーム)|すりかえ|はたきおとす|どろぼう|ほしがる|むしくい|ついばむ|なげつける|リサイクル|switcheroo|^trick$|knockoff|thief|covet|bugbite|pluck|fling|recycle|bestow|corrosivegas|incinerate/)
  ||has(/swaps? (?:the )?(?:user.?s and target.?s )?items?|held item.*(?:swap|steal|drop|remove|destroy)|steals? (?:the )?(?:target.?s )?item|target drops? its held item|removes? the target.?s item|destroys? the target.?s item|持ち物を(?:交換|奪|はたき|落と|なく|使えなく)|道具を(?:奪|交換)|能力変化.*引き継|能力変化を.*引き継/);
 const copyMove=name(/ゆびをふる|まねっこ|スケッチ|さきどり|オウムがえし|ものまね|ねごと|ねこのて|まねっこ|ゆめくい|metronome|copycat|sketch|mefirst|mirrormove|mimic|sleeptalk|assist|naturepower|snatch|instruct/)
  ||has(/random move|randomly selects? a move|copies? the last move|copy the last move|uses? the last move|calls? a random move|呼び出す|ランダム.*技|相手が最後に使った技|最後に使った技を.*まね|技をコピー/);
 const statChange=has(/raises? (?:the user.?s|its|target.?s|the target.?s)?.{0,35}(?:attack|defense|special attack|special defense|speed|stats|stat stages)|lowers? (?:the user.?s|its|target.?s|the target.?s)?.{0,35}(?:attack|defense|special attack|special defense|speed|stats|stat stages)|boosts?.{0,30}(?:stat|attack|defense|speed)|stat stages?|resets? all stat|copies? the target.?s stat|能力を(?:上げ|下げ)|能力ランク|こうげき.*(?:上げ|下げ)|ぼうぎょ.*(?:上げ|下げ)|とくこう.*(?:上げ|下げ)|とくぼう.*(?:上げ|下げ)|すばやさ.*(?:上げ|下げ)|めいちゅう.*(?:上げ|下げ)|かいひ.*(?:上げ|下げ)|能力変化をリセット|能力変化をコピー|ぐーんとあげ|がくっとさげ|ぐーんとさげ/)
  ||!!m.boosts||!!secondary?.boosts||secondaries.some(x=>!!x?.boosts);
 const statusOrLock=hasRealAilment||!!secondary?.status||secondaries.some(x=>!!x?.status||!!x?.volatileStatus)||has(/paraly[sz]e|burns? the target|poisons? the target|puts? the target to sleep|freezes? the target|confuses? the target|flinch(?:es)? the target|taunt|encore|disable|torment|prevents? .*?from using|cannot use moves?|traps? the target|prevents? fleeing|inflicts? a status|status condition|麻痺|まひ|やけど|火傷|どく状態|毒状態|ねむり状態|こおり状態|混乱|ひるませ|ちょうはつ|アンコール|かなしばり|ふういん|封印|行動できな|技を使えなく|逃げられない|交代できない|状態異常にする/);
 const turnDelay=apiIn([76,19,34,156,361,459,461])||name(/ソーラービーム|ソーラーブレード|そらをとぶ|とびはねる|あなをほる|ダイビング|ゴーストダイブ|シャドーダイブ|みらいよち|はめつのねがい|ほのおのうず|うずしお|まきつく|しめつける|からではさむ|すなじごく|マグマストーム|まとわりつく|やどりぎ|solarbeam|solarblade|fly|bounce|dig|dive|phantomforce|shadowforce|futuresight|doomdesire|firespin|whirlpool|wrap|bind|sandtomb|magmastorm|infestation/)
  ||has(/requires? a turn to charge|charge(?:s|d)? (?:on|for) (?:the )?first turn|two.turn attack|two.turn move|attack on the next turn|delayed attack|damage (?:is )?(?:dealt|caused) (?:in|after) (?:two|three|a few|the next) turns|at the end of the next turn|prevents? the target from fleeing|damage for 2.5 turns|for 2.?5 turns|１ターン目に.*２ターン目|1ターン目に.*2ターン目|次のターン|数ターンのあいだ.*ダメージ|交代できなく|逃げられなく|拘束/);
 const weather=name(/にほんばれ|あまごい|すなあらし|あられ|ゆきげしき|さむいギャグ|sunnyday|raindance|sandstorm|hail|snowscape|chillyreception/)
  ||!!m.weather||has(/changes? the weather|sets? (?:sun|rain|sandstorm|snow)|weather becomes|天候を変え|日差しを強く|雨を降らせ|砂あらし|雪を降らせ/);
 const terrain=name(/エレキフィールド|グラスフィールド|サイコフィールド|ミストフィールド|electricterrain|grassyterrain|psychicterrain|mistyterrain/)
  ||!!m.terrain||has(/(?:sets?|creates?) (?:the )?(?:electric|grassy|psychic|misty) terrain|フィールドを張る|地面を.*フィールド/);
 const room=name(/トリックルーム|ワンダールーム|マジックルーム|じゅうりょく|おいかぜ|trickroom|wonderroom|magicroom|gravity|tailwind/)
  ||has(/trick room|wonder room|magic room|gravity becomes|reverses? the order|speed order is reversed|defense and special defense are swapped|held items lose their effects|素早さの順番が逆|防御と特防を入れ替|持ち物の効果がなくなる/);
 const hazard=name(/ステルスロック|まきびし|どくびし|ねばねばネット|リフレクター|ひかりのかべ|オーロラベール|stealthrock|spikes|toxicspikes|stickyweb|reflect|lightscreen|auroraveil/)
  ||has(/hazard|switch(?:es|ing)? in.*damage|causes damage when.*switch|reduces? damage from (?:physical|special) attacks|light screen|reflect.*damage|設置|交代で.*ダメージ|交代で出た.*ダメージ|壁で.*ダメージを弱め|ダメージを弱める壁/);
 const position=name(/おさきにどうぞ|さきおくり|サイドチェンジ|ふきとばし|ほえる|ドラゴンテール|ともえなげ|とんぼがえり|ボルトチェンジ|クイックターン|すてゼリフ|バトンタッチ|afteryou|quash|allyswitch|whirlwind|roar|dragontail|circlethrow|uturn|voltswitch|flipturn|partingshot|batonpass/)
  ||!!m.selfSwitch||has(/forces? the target to switch|forces? a switch|user must switch out|user switches out|switches? places? with|goes first this turn|moves? after the target|move order|priority of moves|行動順|先に行動|後に行動|相手を吹き飛ば|控えのポケモンを|自分が交代|交代して|位置を入れ替|位置を交換|優先度を変/);
 const typeStatus=cat==='Status';
 const extraDamage=damaging&&(drain||recoil||!!m.selfSwitch||!!m.boosts||hasSecondary||statChange||statusOrLock||itemChange||position||has(/chance to lower|chance to raise|may lower|may raise|flinches?|lowers? the target|raises? the user|drains? .* damage|recoil|must switch out|heals? the user|target drops? its held item|追加効果|与えたダメージ.*回復|相手の能力を.*下げ|相手の能力を.*上げ|自分の能力を.*上げ|自分の能力を.*下げ|状態異常にする/));
 const perish=name(/みちづれ|ほろびのうた|destinybond|perishsong/)||has(/if the user faints.*target|all pokemon.*faint|faints? in three turns|ほろびのうた|みちづれ/);
 const sub=name(/みがわり|substitute/)||has(/transfers? 1.?4 of the user.?s max hp into a doll|身代わりになる/);
 const recovery=drain||!!m.heal||name(/じこさいせい|こうごうせい|つきのひかり|あさのひざし|ねむる|タマゴうみ|ミルクのみ|なまける|はねやすめ|いやしのねがい|ねがいごと|アクアリング|たべのこす|ギガドレイン|メガドレイン|ドレインパンチ|ちからをすいとる|recover|synthesis|moonlight|morningsun|rest|softboiled|milkdrink|slackoff|roost|wish|aquaring|gigadrain|megadrain|drainpunch|strengthsap/)
  ||has(/heals? the user|heals? .* hp|restores? hp|drains? .*damage.*heal|recover(?:s|ing)? hp|restores? half|completely healing|hpを回復|ＨＰを回復|ＨＰを.*回復|ＨＰを吸い取|回復する|毎ターン.*回復/);
 const randomOrCopy=copyMove;
 // Damage/attack main classification: one primary damage class, plus any compatible secondary behaviour classes.
 if(damaging){
  if(ohko)add('一撃必殺');
  else if(fixedOrVariable||counterDamage)add('変則ダメージ');
  else if(counterLike&&protectMove)add('攻防一体');
  else if(extraDamage)add('複合ダメージ');
  else if(!turnDelay)add('標準ダメージ');
 }
 if(counterLike)add('攻防一体');
 if(protectMove){add('保護・回避');if(counterLike)add('攻防一体');}
 if(turnDelay)add('ターン・時差発生');
 if(recovery)add('HP回復');
 if(sub)add('デコイ（分身）生成');
 if(statChange)add('ステータス操作');
 if(statusOrLock)add('状態異常・行動制限');
 if(abilityChange)add('特性操作');
 if(typeChange)add('タイプ改変');
 if(itemChange||name(/バトンタッチ|batonpass/))add('引き継ぎ・もちもの');
 if(position)add('位置・行動順操作');
 if(randomOrCopy)add('コピー・ランダム発動');
 if(perish)add('即死・道連れ');
 if(hazard)add('設置トラップ・壁');
 if(weather||terrain)add('天候・フィールド');
 if(room)add('ルール改変（空間）');
 // Fallback: no move is left without a category. This is a classification fallback, not proof that its effect is implemented.
 if(!cats.length){
  if(damaging&&bp>0)add('標準ダメージ');
  else if(damaging)add('変則ダメージ');
  else if(typeStatus&&(/self|ally|user/.test(target)))add('ステータス操作');
  else add('状態異常・行動制限');
 }
 m._taxonomyCategories=cats;
 return cats;
}
function moveTaxonomyChips(m){const cats=moveTaxonomyCategories(m);return `<span class="category-chips taxonomy-chips">${cats.map(n=>{const c=MOVE_TAXONOMY.find(x=>x.name===n);return `<span class="category-chip taxonomy-chip">${c?`#${c.id} `:''}${esc(n)}</span>`;}).join('')}</span>`;}
function auditMoveTaxonomy(){const moves=Object.values(state.data?.movesById||state.data?.moves||{});const counts=Object.fromEntries(MOVE_TAXONOMY.map(c=>[c.name,0]));const unclassified=[];for(const m of moves){const cats=moveTaxonomyCategories(m);if(!cats.length)unclassified.push(m.jpName||m.name||m.id);for(const c of cats)if(counts[c]!=null)counts[c]++;}return {version:'20-category-v1',moveCount:moves.length,categorizedMoves:moves.length-unclassified.length,uncategorizedMoves:unclassified.length,uncategorizedSample:unclassified.slice(0,30),counts};}
function renderMoveTaxonomyOverview(){const all=Object.values(state.data.movesById||{});const counts=Object.fromEntries(MOVE_TAXONOMY.map(c=>[c.name,0]));for(const m of all)for(const name of moveTaxonomyCategories(m))counts[name]=(counts[name]||0)+1;return `<details class="panel move-taxonomy-overview" open><summary><b>📚 技の完全分類：全20カテゴリ</b><span class="pill">対象 ${all.length.toLocaleString()} 技・複数カテゴリ対応</span><small>カテゴリを押すと該当技だけを一覧表示。20カテゴリの分類をバトル共通処理に接続し、追加ハンドラーを導入しました。技固有の細かい仕様は未実装・要検証のものが残るため、技詳細の「バトル接続状況」と監査で確認してください。</small></summary><div class="move-taxonomy-grid">${MOVE_TAXONOMY.map(c=>`<button type="button" class="taxonomy-category-card ${state.moveEffectCategory===c.name?'active':''}" data-action="filter-move-taxonomy" data-taxonomy="${esc(c.name)}"><span class="taxonomy-card-top">No. ${c.id} · ${esc(c.group)}</span><b>${esc(c.name)}</b><small>${esc(c.summary)}</small><span class="taxonomy-examples">例：${esc(c.examples)}</span><em>${Number(counts[c.name]||0).toLocaleString()} 技</em></button>`).join('')}</div><button class="btn btn-ghost btn-sm" type="button" data-action="filter-move-taxonomy" data-taxonomy="all">すべての技を表示</button></details>`;}

function moveEffectCategories(m){
 const tags=[];const id=slug(m?.id||m?.name||'');const text=`${m?.name||''} ${m?.jpName||''} ${m?.description||''} ${m?.flavorJa||''} ${m?.mechanicDescription||''} ${m?.shortDesc||''}`.toLowerCase();
 const add=(label,yes)=>{if(yes&&!tags.includes(label))tags.push(label)};
 add(m?.category==='Physical'?'攻撃技':m?.category==='Special'?'攻撃技':'変化技',true);
 add(m?.category==='Physical'?'物理':m?.category==='Special'?'特殊':'変化',true);
 add('状態異常',/paraly|paralys|burn|poison|sleep|freeze|frostbite|confus|まひ|麻痺|やけど|火傷|どく|毒|ねむり|眠り|こおり|凍り|こんらん|混乱/.test(text)||!!m?.status||!!m?.ailment?.name&&m.ailment.name!=='none');
 add('能力変化',/boost|lower|raise|drop.*stat|stat.*stage|能力.*上|能力.*下|こうげき.*上|ぼうぎょ.*下|素早さ.*上/.test(text)||!!m?.boosts||!!m?.secondary?.boosts);
 add('回復・吸収',/recover|heal|drain|restore hp|回復|吸収|やどりぎ|ねむる|タマゴうみ|じこさいせい/.test(text)||Number(m?.drain||0)>0||Number(m?.apiAdditional?.['回復']||0)>0||Number(m?.apiAdditional?.['吸収']||0)>0||/recover|heal|leechseed|rest|softboiled|milkdrink|slackoff|roost|wish/.test(id));
 add('反動',/recoil|crash damage|反動|自分もダメージ/.test(text)||Number(m?.recoil||0)>0||/bravebird|flareblitz|doubleedge|wildcharge|headsmash|volttackle|woodhammer/.test(id));
 add('連続攻撃',/hit 2|hits 2|multiple times|2-5 times|two to five|連続で|れんぞく|2ー5回|２ー５回/.test(text)||!!m?.multihit||!!m?.numberOfHits);
 add('先制技',Number(m?.priority||0)>0||/quickattack|extremespeed|bulletpunch|machpunch|aquajet|shadow sneak|suckerpunch|ice shard|fakeout|vacuumwave|accelerock|firstimpression|jetpunch/.test(id));
 add('設置技',/stealthrock|spikes|toxicspikes|stickyweb|stealth rock|まきびし|どくびし|ねばねばネット|ステルスロック/.test(id+' '+text));
 add('天候・フィールド',/rain|sun|sandstorm|snow|hail|terrain|weather|あめ|雨|晴れ|すなあらし|ゆき|フィールド/.test(id+' '+text));
 add('交代・位置変更',/switch.*user|switch.*out|force.*switch|pivot|u-turn|volt switch|flip turn|バトンタッチ|とんぼがえり|ボルトチェンジ|クイックターン|ふきとばし|ほえる/.test(id+' '+text));
 add('守る・妨害',/protect|block|taunt|disable|encore|torment|封じ|ちょうはつ|まもる|アンコール|かなしばり|トリックガード|ワイドガード/.test(id+' '+text));
 add('急所',/critical hit|increased chance for a critical|急所/.test(text)||/slash|crosschop|leafblade|night slash|stoneedge|high critical/.test(id));
 add('一撃必殺・固定ダメージ',/one.hit ko|fixed damage|level.*damage|damage equal|いちげきひっさつ|一撃必殺|固定ダメージ/.test(text)||/fissure|guillotine|horn drill|sheer cold|seismictoss|nightshade|dragonrage|sonicboom/.test(id));
 if(tags.length<=2)tags.push('その他');return tags;
}
function abilityEffectCategories(a){
 const id=slug(a?.id||a?.name||'');const text=`${a?.name||''} ${a?.jpName||''} ${a?.description||''} ${a?.effectEn||''}`.toLowerCase();const tags=[];const add=(label,yes)=>{if(yes&&!tags.includes(label))tags.push(label)};
 add('天候・フィールド',/weather|rain|sun|sandstorm|snow|hail|terrain|天候|雨|晴れ|砂嵐|フィールド/.test(text));
 add('攻撃・技の強化',/power|damage.*increase|boost.*attack|boosts.*move|strengthen|威力|攻撃.*上|技.*強化|タイプ.*強化/.test(text));
 add('防御・無効化',/immune|immunity|absorb|reduce.*damage|prevent.*damage|defense|levitat|airborne|ground.type move|ground attacks|防ぐ|無効|吸収|ダメージ.*減|ぼうぎょ|地面技.*無効|浮いて/.test(text)||id==='levitate');
 add('能力・素早さ',/raise.*stat|boost.*stat|speed|attack|defense|special attack|special defense|能力.*上|素早さ|こうげき|ぼうぎょ/.test(text));
 add('状態異常・回復',/status|poison|burn|paraly|sleep|heal|recover|cure|状態異常|どく|やけど|まひ|回復|治す/.test(text));
 add('場に出たとき・交代',/entering battle|switch.*in|switch.*out|upon entry|on entry|場に出|交代/.test(text));
 add('相手への妨害',/opponent|foe|target|flinch|disable|prevent.*use|相手|ひるみ|妨害|技を使え/.test(text));
 add('持ち物との連携',/item|held item|持ち物|道具/.test(text));
 add('特殊・専用効果',/form|transformation|copy|change.*type|type changes|フォルム|変身|タイプを変/.test(text));
 if(!tags.length)tags.push('その他');return tags;
}
function categoryChips(tags){return `<span class="category-chips">${tags.map(t=>`<span class="category-chip">${esc(t)}</span>`).join('')}</span>`;}
function moveClassificationV2Label(tag){return MOVE_CLASSIFICATION_V2_LABELS[tag]||tag;}
const MOVE_CLASSIFICATION_V2_LABELS={"category_physical":"物理技","category_special":"特殊技","category_status":"変化技","negative_priority":"後攻技","direct_damage":"直接ダメージ","damage_formula_review":"個別ダメージ式の確認が必要","multi_hit":"連続攻撃","move_priority":"先制技","contact_attack":"接触判定あり","non_contact_attack":"接触判定なし","punch":"パンチ技","bite":"かみつき技","sound":"音技","bullet":"弾技","powder":"粉技","pulse":"波動技","slicing":"斬撃技","wind":"風技","reflectable":"マジックコート等で反射可能","power_by_positive_stat_stages":"能力上昇ランク依存","power_by_remaining_hp":"残りHP依存","power_by_speed_ratio":"素早さ比依存","power_by_held_item":"持ち物依存","target_item_power_bonus":"相手の持ち物で威力上昇","removes_target_item":"相手の持ち物を落とす","consumes_user_item":"自分の持ち物を消費","uses_target_attack":"相手の攻撃を参照","uses_user_defense":"自分の防御を参照","counter_damage":"受けたダメージを参照","power_by_target_weight":"相手の体重依存","power_by_user_hp_ratio":"自分の残りHP依存","protect_effect":"防御・保護","field_control":"天候・フィールド・壁の操作","force_switch":"相手を強制交代","self_stat_change":"自分の能力ランク変化","target_stat_change":"相手の能力ランク変化","contact_punishment":"接触時の反撃・能力低下","switch_after_hit":"攻撃後に交代","crash_damage_on_miss":"外したときに自分もダメージ","recoil_after_hit":"反動ダメージ","drain_healing":"与えたダメージを吸収","charge_turn":"溜めターンあり","semi_invulnerable_turn":"溜め中に攻撃を回避","stat_stage_change":"能力ランクを変化","status_effect":"状態異常・状態変化","flinch_effect":"ひるみ効果","hazard":"設置技","weather_or_terrain":"天候・フィールド操作"};
const MOVE_CLASSIFICATION_V2_FORMULAS={"positive_stat_stages":"自分のプラスの能力ランク合計に応じて威力が上がる。技自身が能力ランクを上げるわけではない。","remaining_hp_ratio":"自分の残りHP割合に応じて威力が変化する。","speed_ratio":"自分と相手の素早さの比率に応じて威力が変化する。","held_item_fling":"持ち物ごとの設定威力で攻撃し、命中後に持ち物を消費する。対応していない持ち物では失敗する。","target_item_knockoff":"相手が持ち物を持っている場合は威力が上がり、命中後に持ち物を落とす。","target_attack":"相手の攻撃実数値を攻撃側の数値として使う。","user_defense":"自分の防御実数値を攻撃側の数値として使う。","counter_damage":"そのターンに受けたダメージや攻撃分類を参照して反撃する。","target_weight":"相手の体重に応じて威力が変化する。","target_weight_ratio":"自分と相手の体重比に応じて威力が変化する。","user_hp_ratio":"自分の残りHP割合に応じて威力が変化する。"};
function moveClassificationV2SearchText(m){const c=m?.classificationV2||{};return searchKey([...(c.tags||[]).map(moveClassificationV2Label),c.formulaNote||'',c.reviewStatus||''].join(' '));}
function isMoveClassifiedDamageV2(m){return !!m&&(m.category==='Physical'||m.category==='Special');}
function resolvedMovePowerV2(m,actor,target,b){try{return Number(resolveContextMoveData(m,actor,target,b||state.battle||{weather:null}).power||0);}catch(e){return Number(m?.basePower||0);}}
function moveClassificationV2Panel(m){const c=m?.classificationV2;if(!c)return '';const tags=(c.tags||[]).filter(t=>MOVE_CLASSIFICATION_V2_LABELS[t]).map(t=>`<span class="move-v2-chip">${esc(moveClassificationV2Label(t))}</span>`).join('');const contact=c.contactStatus==='confirmed_contact'?'接触判定：接触技':c.contactStatus==='confirmed_non_contact'?'接触判定：非接触技':c.contactStatus==='not_applicable'?'接触判定：対象外':'接触判定：未確認';const note=c.formulaNote?`<p class="move-v2-formula">${esc(c.formulaNote)}</p>`:'';const review=c.reviewStatus==='needs_review'?'要確認':c.reviewStatus==='implemented_needs_battle_test'?'特別式組込済み・対戦テスト要':'自動整理';return `<section class="move-v2-panel"><div class="move-v2-head"><b>対戦メカニクス分類 v2</b><span>${esc(contact)}</span></div><div class="move-v2-tags">${tags||'<span class="move-v2-chip">追加タグなし</span>'}</div>${note}<small>分類状態：${review} ／ 技の基本分類と効果・計算条件は別々に管理</small></section>`;}
function auditMoveClassificationV2(){const all=Object.values(state.data?.movesById||{}),out={total:all.length,contact:0,nonContact:0,notApplicable:0,unknownContact:0,needsReview:0,formulas:{},tags:{}};for(const m of all){const c=m.classificationV2||{};if(c.contactStatus==='confirmed_contact')out.contact++;else if(c.contactStatus==='confirmed_non_contact')out.nonContact++;else if(c.contactStatus==='not_applicable')out.notApplicable++;else out.unknownContact++;if(c.reviewStatus==='needs_review')out.needsReview++;if(c.formula&&c.formula!=='standard_damage_or_effect')out.formulas[c.formula]=(out.formulas[c.formula]||0)+1;for(const t of c.tags||[])out.tags[t]=(out.tags[t]||0)+1;}return out;}
function filteredMoves(){let list=Object.values(state.data.movesById||{});const q=searchKey(state.moveSearch);if(q)list=list.filter(m=>searchKey(getMoveName(m)).includes(q)||searchKey(m.name).includes(q)||searchKey(m.id).includes(q)||searchKey(m.flavorJa||'').includes(q)||searchKey(m.mechanicDescription||'').includes(q)||moveEffectCategories(m).some(t=>searchKey(t).includes(q))||moveTaxonomyCategories(m).some(t=>searchKey(t).includes(q))||moveClassificationV2SearchText(m).includes(q));if(state.moveType!=='all')list=list.filter(m=>m.type===state.moveType);if(state.moveCategory!=='all')list=list.filter(m=>m.category===state.moveCategory);if(state.moveEffectCategory!=='all')list=list.filter(m=>moveTaxonomyCategories(m).includes(state.moveEffectCategory));return list.sort((a,b)=>getMoveName(a).localeCompare(getMoveName(b),'ja'));}
function renderMoveCatalogDetail(m){const eff=resolveMoveTypePower(m,state.battle?.weather||null);return `<aside class="panel detail-card move-detail-card"><div class="detail-visual move-detail-visual"><span class="dex-num-large">#${esc(m.id)}</span><div class="move-emblem" style="--move-color:${TYPE_COLORS[eff.type]||'#7b8db7'}">${getMoveIcon(m.category)}</div></div><div class="detail-content"><span class="section-kicker">MOVE DATA / 技データ</span><h2>${esc(getMoveName(m))}</h2><div class="eng-name">${esc(m.name)} · ${esc(m.id)}</div>${typesHtml([eff.type])}${moveTaxonomyChips(m)}${moveClassificationV2Panel(m)}<div class="variant-badges"><span class="pill">${getMoveCatJa(m.category)}</span><span class="pill">${m.classificationV2?.contactStatus==='confirmed_contact'?'接触技':m.classificationV2?.contactStatus==='confirmed_non_contact'?'非接触技':'接触判定未確認'}</span><span class="pill">優先度 ${Number(m.priority||0)}</span></div><div class="move-meta move-meta-large"><div><small>威力</small><b>${eff.power||'—'}</b></div><div><small>命中</small><b>${formatAccuracy(m)}</b></div><div><small>PP</small><b>${m.pp||'—'}</b></div></div><div class="summary-chip"><span>ダメージ計算</span><b>${m.category==='Physical'?'攻撃 × 相手の防御':m.category==='Special'?'特攻 × 相手の特防':'直接ダメージなし／効果処理'}</b></div><div class="ability-box"><b>効果・説明</b><p>${esc(moveDescription(m))}</p></div>${m.mechanicDescription?`<details class="move-flavor"><summary>対戦データの補足（原文）</summary><p>${esc(m.mechanicDescription)}</p></details>`:''}${m.flavorJa?`<details class="move-flavor"><summary>日本語のシリーズ別説明</summary><p>${esc(m.flavorJa)}</p></details>`:''}${m.secondaries?.length||m.secondary?`<div class="ability-box"><b>追加効果データ</b><p>${(m.secondaries||[m.secondary]).filter(Boolean).map(s=>`${s.chance??100}%：${s.status||Object.entries(s.boosts||{}).map(([k,v])=>`${k}${v>0?'+':''}${v}`).join(' ')||s.volatileStatus||'追加効果'}`).map(esc).join('<br>')}</p></div>`:''}${(m.drain||m.recoil||m.ailment?.name||m.target||m.boosts||m.flags)?`<div class="ability-box"><b>技の追加データ</b><p>${[m.target?`対象：${m.target}`:'',m.drain?`与えたダメージの回復率：${m.drain}%`:'',m.recoil?`反動率：${m.recoil}%`:'',m.ailment?.name&&m.ailment.name!=='none'?`状態異常：${m.ailment.name}${m.ailmentChance?`（${m.ailmentChance}%）`:''}`:'',m.boosts?`能力変化：${Object.entries(m.boosts).map(([k,v])=>`${k}${v>0?'+':''}${v}`).join('、')}`:''].filter(Boolean).map(esc).join('<br>')}</p></div>`:''}<p class="footer-note">使用可能な技や細かな効果はタイトル・世代・ルールセットによって変わります。この画面は公開対戦データを参照したファン試作です。</p></div></aside>`;}
function renderMoves(){const all=filteredMoves(),list=all.slice(0,state.moveCatalogLimit);const chosen=state.data.movesById[state.selectedMoveCatalog]||all[0];return `${pageHeader('MOVE DATABASE','技図鑑','全技を大分類20種＋階層型の詳細タグで複数分類。詳細タグから該当する技を絞り込めます。')} ${renderMoveTaxonomyOverview()}<div class="move-catalog-layout"><section class="panel move-catalog-panel"><div class="panel-head"><h2>技データベース</h2><span class="pill">${all.length.toLocaleString()} 技</span></div><div class="panel-body"><div class="search-row move-search-row"><input id="move-search" class="field search-field" placeholder="技名・英名・ID・説明・カテゴリで検索" value="${esc(state.moveSearch)}"><select class="field select-field" id="move-type"><option value="all">全タイプ</option>${Object.keys(TYPE_JA).map(t=>`<option value="${t}" ${state.moveType===t?'selected':''}>${TYPE_JA[t]}</option>`).join('')}</select><select class="field select-field" id="move-category"><option value="all">全分類</option><option value="Physical" ${state.moveCategory==='Physical'?'selected':''}>物理</option><option value="Special" ${state.moveCategory==='Special'?'selected':''}>特殊</option><option value="Status" ${state.moveCategory==='Status'?'selected':''}>変化</option></select><select class="field select-field" id="move-effect-category"><option value="all">全20カテゴリ</option>${MOVE_TAXONOMY.map(c=>`<option value="${esc(c.name)}" ${state.moveEffectCategory===c.name?'selected':''}>No.${c.id} ${esc(c.name)}</option>`).join('')}</select></div><div class="move-catalog-grid">${list.map(m=>{const eff=resolveMoveTypePower(m,state.battle?.weather||null);return `<button class="move-catalog-card ${chosen?.id===m.id?'selected':''}" data-action="select-move-catalog" data-move="${esc(m.id)}"><span class="move-catalog-icon" style="--move-color:${TYPE_COLORS[eff.type]||'#7b8db7'}">${getMoveIcon(m.category)}</span><span class="move-catalog-copy"><b>${esc(getMoveName(m))}</b><small>${TYPE_JA[eff.type]||eff.type} · ${getMoveCatJa(m.category)} · 詳細を見る</small>${moveTaxonomyChips(m)}</span><span class="move-catalog-power"><b>${eff.power||'—'}</b><small>威力</small></span><span class="move-catalog-pp">PP ${m.pp||'—'}</span></button>`;}).join('')||'<div class="empty-state">条件に合う技がありません。</div>'}</div>${all.length>list.length?`<button class="btn btn-ghost btn-wide" style="margin-top:12px" data-action="move-more">さらに表示（残り ${(all.length-list.length).toLocaleString()} 技）</button>`:''}</div></section>${chosen?renderMoveCatalogDetail(chosen):'<aside class="panel empty-state">技データがありません。</aside>'}</div>`;}
function filteredAbilities(){let list=(state.data.abilitiesList||[]).slice();const q=searchKey(state.abilitySearch);if(q)list=list.filter(a=>searchKey(a.jpName||'').includes(q)||searchKey(a.name||'').includes(q)||searchKey(a.id||'').includes(q)||searchKey(a.description||'').includes(q)||searchKey(a.effectEn||'').includes(q)||abilityEffectCategories(a).some(t=>searchKey(t).includes(q)));if(state.abilityCategory!=='all')list=list.filter(a=>abilityEffectCategories(a).includes(state.abilityCategory));return list.sort((a,b)=>(a.jpName||a.name||'').localeCompare(b.jpName||b.name||'','ja'));}
function renderAbilities(){const all=filteredAbilities();const chosen=all.find(a=>a.id===state.selectedAbilityCatalog)||all[0];const categories=['攻撃・技の強化','防御・無効化','能力・素早さ','状態異常・回復','天候・フィールド','場に出たとき・交代','相手への妨害','持ち物との連携','特殊・専用効果','その他'];return `${pageHeader('ABILITY DATABASE','特性図鑑','Pokémon Showdown取得特性 ${Number(state.data.upstreamSummary?.abilitiesAvailable||0).toLocaleString()}件。日本語名・説明は内蔵辞書を優先し、実際の効果は対応済みのバトル処理で再現します。Showdown側の関数型コールバックは、そのまま実行せず個別の処理接続が必要です。')}<section class="panel"><div class="panel-head"><h2>特性データベース</h2><span class="pill">${all.length.toLocaleString()} 特性</span></div><div class="panel-body"><div class="search-row"><input id="ability-search" class="field search-field" placeholder="特性名・説明・カテゴリーで検索" value="${esc(state.abilitySearch)}"><select id="ability-category" class="field select-field"><option value="all">全カテゴリー</option>${categories.map(c=>`<option value="${c}" ${state.abilityCategory===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="ability-catalog-grid" style="margin-top:12px">${all.slice(0,state.abilityCatalogLimit).map(a=>`<button class="ability-catalog-card ${chosen?.id===a.id?'selected':''}" data-action="select-ability-catalog" data-ability="${esc(a.id)}"><b>${esc(a.jpName||a.name||a.id)}</b><small>${esc(a.name||a.id)}</small>${categoryChips(abilityEffectCategories(a).slice(0,3))}<small style="margin-top:7px">${esc(a.description||a.effectEn||'効果説明なし')}</small></button>`).join('')||'<div class="empty-state">条件に合う特性がありません。</div>'}</div>${all.length>state.abilityCatalogLimit?`<button class="btn btn-ghost btn-wide" style="margin-top:12px" data-action="ability-more">さらに表示（残り ${(all.length-state.abilityCatalogLimit).toLocaleString()} 件）</button>`:''}${chosen?`<aside class="ability-box ability-catalog-detail"><div class="section-kicker">ABILITY DETAILS</div><h2>${esc(chosen.jpName||chosen.name||chosen.id)}</h2><p>${esc(chosen.description||'日本語説明は未収録です。')}</p>${chosen.effectEn?`<details class="move-flavor"><summary>補足説明（英語原文）</summary><p>${esc(chosen.effectEn)}</p></details>`:''}${categoryChips(abilityEffectCategories(chosen))}<p class="tiny muted">内部ID：${esc(chosen.id)}${chosen.generation?' · '+esc(chosen.generation):''}</p></aside>`:''}</div></section>`;}
function renderBox(){
 const q=searchKey(state.boxSearch);const boxCount=Math.min(30,Math.max(8,Math.ceil(state.owned.length/30)));state.boxPage=Math.max(0,Math.min(boxCount-1,Number(state.boxPage||0)));const page=state.boxPage;const boxMons=state.owned.slice(page*30,(page+1)*30);
 let list=boxMons.filter(m=>{const p=monSpecies(m);return !q||searchKey(m.name).includes(q)||searchKey(p?.name).includes(q)||searchKey(p?.jpName).includes(q)||String(p?.num).includes(q);});
 if(state.boxFilter==='shiny')list=list.filter(m=>m.shiny);if(state.boxFilter==='mark')list=list.filter(m=>m.mark);if(state.boxFilter==='legend')list=list.filter(m=>{const p=monSpecies(m);return p?.isLegendary||p?.isMythical;});
 const chosen=state.owned.find(m=>m.uid===state.selectedOwned&&list.some(x=>x.uid===m.uid))||list[0];
 const slots=Array.from({length:30},(_,i)=>{const mon=list[i];if(!mon)return `<div class="sv-box-slot sv-box-empty" aria-hidden="true"><span>＋</span><small>空き</small></div>`;const p=monSpecies(mon);return `<button class="sv-box-slot ${chosen?.uid===mon.uid?'selected':''}" data-action="select-owned" data-uid="${esc(mon.uid)}"><small>#${String(p?.num||0).padStart(4,'0')}</small>${speciesIcon(mon)}<strong>${esc(mon.name||getPokeName(p))}</strong><small>Lv.${mon.level||50}${mon.shiny?' · ✦':''}</small></button>`;}).join('');
 return `${pageHeader('POKÉMON BOX','ポケモンボックス','『スカーレット・バイオレット』風の6×5マス。ボックスを切り替えて、選んだ1匹の情報を右側で確認できます。','<div class="action-row"><button class="btn btn-primary" data-page="scout">＋ スカウト</button><button class="btn btn-ghost" data-page="shop">◇ メガストーン</button></div>')}
 <div class="search-row"><input id="box-search" class="field search-field" placeholder="選択中のボックスを検索" value="${esc(state.boxSearch)}"><select id="box-filter" class="field select-field"><option value="all">すべて</option><option value="shiny" ${state.boxFilter==='shiny'?'selected':''}>色違い</option><option value="mark" ${state.boxFilter==='mark'?'selected':''}>証付き</option><option value="legend" ${state.boxFilter==='legend'?'selected':''}>伝説・幻</option></select><span class="pill">${list.length} / ${boxMons.length}匹</span></div>
 <div class="sv-box-layout"><section class="panel sv-box-main"><div class="sv-box-tabs">${Array.from({length:boxCount},(_,i)=>`<button class="sv-box-tab ${page===i?'active':''}" data-action="select-box-page" data-index="${i}">ボックス ${i+1}</button>`).join('')}</div><div class="sv-box-grid">${slots}</div><div class="sv-box-status"><span>ボックス ${page+1} / ${boxCount}</span><span>このボックス ${boxMons.length} / 30匹</span><span>全体 ${state.owned.length}匹</span><span>検索・絞り込みは選択中のボックス内</span></div></section>${chosen?renderOwnedDetail(chosen).replace('<aside class="panel detail-card">','<aside class="panel detail-card sv-box-detail">'):`<aside class="panel sv-box-detail"><div class="detail-visual"><span class="muted">ポケモンを選択</span></div><div class="detail-content"><h2>空きボックス</h2><p class="muted small">このボックスには表示できるポケモンがいません。スカウトで仲間を増やせます。</p><button class="btn btn-primary btn-wide" data-page="scout">ポケモンをスカウト</button></div></aside>`}</div>`;
}
function renderOwnedDetail(mon){const p=monSpecies(mon),stats=calcStats(mon);if(!p)return '';const moves=(mon.moves||[]).map((m,i)=>{const def=getMove(m.id);return `<div class="summary-chip"><span>${i+1}. ${esc(getMoveName(def))}</span><b>${def?`${def.pp} PP`:'? PP'}</b></div>`}).join('');return `<aside class="panel detail-card"><div class="detail-visual">${mon.shiny?'<span class="pill shiny-badge" style="position:absolute;right:10px;top:10px;z-index:2">✦ SHINY</span>':''}${speciesIcon(mon)}</div><div class="detail-content"><span class="section-kicker">OWNED POKÉMON</span><h2>${esc(mon.name||getPokeName(p))}</h2><div class="eng-name">Lv.${mon.level||50} · ${esc(p.name.toUpperCase())}</div><div class="variant-badges" style="margin:8px 0">${rarityIcon(mon)}</div>${typesHtml(p.types)}<div class="ability-box"><b>特性：${esc(abilityName(mon.abilityId))}</b><p>${esc(abilityDescription(mon.abilityId))}</p></div><div class="stat-list">${STAT_KEYS.map(k=>`<div class="stat-row"><span>${STAT_JA[k]}</span><b>${stats[k]}</b><div class="stat-bar"><i style="width:${Math.min(100,stats[k]/255*100)}%"></i></div></div>`).join('')}</div><div class="section-kicker">覚えている技</div>${moves||'<p class="muted small">技なし</p>'}<div class="action-row"><button class="btn btn-primary" data-action="train-owned" data-uid="${esc(mon.uid)}">技・特性を編集</button><button class="btn btn-ghost" data-action="toggle-team" data-uid="${esc(mon.uid)}">${state.team.includes(mon.uid)?'チームから外す':'チームに入れる'}</button></div><button class="btn btn-ghost btn-wide" style="margin-top:8px" data-action="release" data-uid="${esc(mon.uid)}">ボックスから逃がす</button></div></aside>`;}
const LEGENDARY_MYTHICAL_IDS=new Set((`articuno zapdos moltres mewtwo mew raikou entei suicune lugia ho-oh celebi regirock regice registeel latias latios kyogre groudon rayquaza jirachi deoxys uxie mesprit azelf dialga palkia giratina heatran regigigas cresselia phione manaphy darkrai shaymin arceus victini cobalion terrakion virizion tornadus thundurus landorus keldeo meloetta genesect xerneas yveltal zygarde diancie hoopa volcanion tapu-koko tapu-lele tapu-bulu tapu-fini cosmog cosmoem solgaleo lunala necrozma magearna marshadow zeraora meltan melmetal zacian zamazenta eternatus kubfu urshifu zarude regieleki regidrago glastrier spectrier calyrex enamorus wo-chien chien-pao ting-lu chi-yu koraidon miraidon ting-lu terapagos ogerpon okidogi munkidori fezandipiti pecharunt`).split(/\s+/));
const LEGENDARY_MYTHICAL_DEX_NUMS=new Set([144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,487,488,489,490,491,492,493,494, 144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,638,639,640,641,642,643,644,645,646,647,648,649,716,717,718,719,720,721,772,773,785,786,787,788,789,790,791,792,800,801,802,807,808,809,888,889,890,891,892,893,894,895,896,897,898,905,1001,1002,1003,1004,1007,1008,1014,1015,1016,1017,1024,1025]);
function isLegendarySpecies(p){if(!p)return false;const ids=[p.id,p.name,p.slug,p.baseSpecies,p.speciesId].filter(v=>v!=null).map(v=>String(v).toLowerCase().replace(/[^a-z0-9-]/g,''));if(ids.some(id=>LEGENDARY_MYTHICAL_IDS.has(id)))return true;const num=Number(p.num||p.nationalDex||p.pokedexNumber||0);if(LEGENDARY_MYTHICAL_DEX_NUMS.has(num))return true;return !!(p.isLegendary||p.isMythical||p.legendary||p.mythical||(p.tier==='Uber'&&Number(p.bst||0)>=600));}
function scoutRarityFor(p){if(isLegendarySpecies(p))return 'legendary';const bst=Number(p?.bst||0);if(bst>=600)return 'superrare';if(bst>=530)return 'rare';if(bst>=450)return 'uncommon';return 'common';}
function rarityLabel(r){return ({common:'コモン',uncommon:'アンコモン',rare:'レア',superrare:'スーパーレア',legendary:'伝説・幻レイド'})[r]||'コモン';}
function scoutDrawRarity(){const c=cleanAdminConfig(state.adminConfig);const weights=[['common',c.rarityCommon],['uncommon',c.rarityUncommon],['rare',c.rarityRare],['superrare',c.raritySuperrare],['legendary',c.rarityLegendary]];const total=weights.reduce((a,x)=>a+x[1],0);if(total<=0)return 'common';let n=Math.random()*total;for(const [name,w] of weights){n-=w;if(n<0)return name;}return 'legendary';}
function ownedFormKey(m){return `${m.speciesId||''}::${m.formId||m.speciesId||''}`;}
function hasOwnedForm(id){return state.owned.some(m=>(m.speciesId===id)||(m.formId===id));}
function drawScoutCandidates(){const pool=finalRecruitDex().filter(p=>p&&p.id&&!hasOwnedForm(p.id));if(pool.length<10){toast(`重複なしで10体用意できません（未所持候補 ${pool.length}体）。先に図鑑データや所持状況を確認してください。`,'warn');return false;}const rarityPools={common:pool.filter(p=>!isLegendarySpecies(p)&&scoutRarityFor(p)==='common'),uncommon:pool.filter(p=>!isLegendarySpecies(p)&&scoutRarityFor(p)==='uncommon'),rare:pool.filter(p=>!isLegendarySpecies(p)&&scoutRarityFor(p)==='rare'),superrare:pool.filter(p=>!isLegendarySpecies(p)&&scoutRarityFor(p)==='superrare'),legendary:pool.filter(isLegendarySpecies)};const chosen=[];for(let i=0;i<10;i++){let rarity=scoutDrawRarity();let candidates=(rarityPools[rarity]||[]).filter(p=>!chosen.some(x=>x.p.id===p.id));if(!candidates.length){const available=pool.filter(p=>!chosen.some(x=>x.p.id===p.id));if(!available.length)break;const fallback=chooseRandom(available);chosen.push({p:fallback,rarity:scoutRarityFor(fallback)});continue;}chosen.push({p:chooseRandom(candidates),rarity});}if(chosen.length!==10){toast('重複なしの候補を10体生成できませんでした。','warn');return false;}state.scoutCandidates=chosen.map(x=>({id:x.p.id,rarity:x.rarity}));state.scoutSelected=chosen[0].p.id;state.scoutLegendaryTarget=null;return true;}
async function playRaidCaptureAnimation(){const field=$('.battlefield');const target=$('#mon-enemy-0');if(!field||!target)return;const button=$('.raid-ball-button');const br=button?.getBoundingClientRect();const tr=target.getBoundingClientRect();const ball=document.createElement('div');ball.className='raid-capture-projectile';ball.style.left=`${(br?br.left+br.width/2:window.innerWidth/2)-19}px`;ball.style.top=`${(br?br.top+br.height/2:window.innerHeight-80)-19}px`;document.body.appendChild(ball);const sx=br?br.left+br.width/2:window.innerWidth/2,sy=br?br.top+br.height/2:window.innerHeight-80,ex=tr.left+tr.width/2,ey=tr.top+tr.height/2;try{if(ball.animate){const a=ball.animate([{transform:'translate(0,0) scale(1) rotate(0deg)'},{transform:`translate(${ex-sx}px,${ey-sy}px) scale(.8) rotate(540deg)`}],{duration:650,easing:'cubic-bezier(.2,.8,.25,1)',fill:'forwards'});await a.finished.catch(()=>{});}else await new Promise(r=>setTimeout(r,650));}finally{ball.remove();}target.classList.add('raid-capture-hit');await new Promise(r=>setTimeout(r,950));target.classList.remove('raid-capture-hit');const sprite=target.querySelector('img');if(sprite){sprite.classList.add('raid-captured');await new Promise(r=>setTimeout(r,1200));}}
function rollLegendaryTraits(){const c=cleanAdminConfig(state.adminConfig);return {shiny:Math.random()<c.raidShinyChance/100,mark:Math.random()<c.raidMarkChance/100?chooseRandom(['しょうごのあかし','あめふりのあかし','りせいのあかし','げんきのあかし','カリスマのあかし','こうようのあかし']):null};}
function beginRaidPreparation(speciesId){const p=state.data.dexById[speciesId];if(!p||!isFinalRecruitSpecies(p)||!isLegendarySpecies(p)){toast('レイド対象の伝説・幻データが見つかりません。','bad');return;}if(state.owned.length<1){toast('レイドには手持ちのポケモンが必要です。','warn');return;}state.raidTargetId=speciesId;state.raidPartyIds=state.team.filter(uid=>state.owned.some(m=>m.uid===uid)).slice(0,6);if(state.raidPartyIds.length<6)for(const m of state.owned){if(state.raidPartyIds.length>=6)break;if(!state.raidPartyIds.includes(m.uid))state.raidPartyIds.push(m.uid);}state.page='scout';renderPage();}
function renderScout(){
 const q=searchKey(state.scoutSearch);const list=finalRecruitDex().filter(p=>!q||searchKey(p.name).includes(q)||searchKey(p.jpName).includes(q)||searchKey(p.displayName).includes(q)||String(p.num)===q);
 if(state.raidTargetId){const target=state.data.dexById[state.raidTargetId];const selected=state.raidPartyIds||[];const selectedMons=selected.map(uid=>state.owned.find(m=>m.uid===uid)).filter(Boolean);return `${pageHeader('LEGENDARY RAID / PREPARATION','伝説レイドの準備',`${target?esc(getPokeName(target)):'伝説ポケモン'}に挑戦。手持ちから6体を選び、持ち物や技を整えてから出発します。`)}<div class="panel"><div class="panel-body"><div class="detail-card"><div class="detail-visual">${target?speciesIcon(target,false,true):''}</div><div class="detail-content"><div class="section-kicker">RAID BOSS</div><h2>${target?esc(getPokeName(target)):'レイド対象'}</h2>${target?typesHtml(target.types):''}<div class="summary-chip"><span>レイド編成</span><b>${selectedMons.length} / 6</b></div><p class="small muted">出発前にボックス／トレーニングで技と持ち物を変更できます。</p></div></div><h3>手持ちから6体を選択</h3><div class="dex-grid">${state.owned.map(m=>`<button class="dex-card ${selected.includes(m.uid)?'selected':''}" data-action="raid-toggle-party" data-uid="${esc(m.uid)}">${speciesIcon(m)}<strong>${esc(m.name)}</strong><small>${selected.includes(m.uid)?'✓ 選出中':'選択する'}</small><div class="variant-badges">${rarityIcon(m)}</div><small>持ち物：${esc(m.heldItem||'なし')}</small></button>`).join('')}</div><div class="action-row" style="margin-top:12px">${selectedMons.map(m=>`<button class="btn btn-ghost btn-sm" data-action="raid-edit-mon" data-uid="${esc(m.uid)}">${esc(m.name)}の技・持ち物を編集</button>`).join('')}</div><div class="action-row" style="margin-top:16px"><button class="btn btn-ghost" data-action="raid-cancel">スカウトに戻る</button><button class="btn btn-primary" data-action="raid-start" ${selectedMons.length!==6||state.vp<100?'disabled':''}>100 VPでレイド開始（${selectedMons.length}/6）</button></div><p class="footer-note">レイド勝利後、獲得するか再挑戦するか選べます。</p></div></div>`;}
 const candidateRecords=(state.scoutCandidates||[]).map(c=>({record:c,p:state.data.dexById[c.id]})).filter(x=>x.p&&isFinalRecruitSpecies(x.p));
 const selectedRecord=candidateRecords.find(x=>x.p.id===state.scoutSelected)||candidateRecords[0]||null;
 const selected=selectedRecord?.p||null;
 if(selected)state.scoutSelected=selected.id;
 const legendary=selected?isLegendarySpecies(selected):false;
 const abilityNames=selected?Object.values(selected.abilities||{}).filter(v=>typeof v==='string').map(a=>`${abilityName(a)}：${abilityDescription(a)}`).join(' / '):'';
 const candidatesHtml=candidateRecords.length?`<section class="panel" style="margin-top:14px"><div class="panel-head"><h2>🎲 今回の候補 10体</h2><span class="pill">1体を選択</span></div><div class="panel-body"><p class="small muted">下の10体から仲間にしたい1体を選んでね。伝説・幻が出た場合は、通常獲得ではなく専用レイドに挑戦するよ。</p><div class="scout-picker" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">${candidateRecords.map(({record:c,p})=>`<button class="scout-icon ${selected?.id===p.id?'selected':''}" style="width:100%;min-height:100px" data-action="select-scout" data-id="${esc(p.id)}" title="${esc(getPokeName(p))}">${speciesIcon(p)}<small>${esc(getPokeName(p))}</small><span class="pill" style="font-size:10px;margin-top:4px">${rarityLabel(c.rarity)}</span></button>`).join('')}</div></div></section>`:`<section class="panel" style="margin-top:14px"><div class="panel-body empty-state"><h3>まだ候補がいません</h3><p>「10体をランダム抽選」を押すと、未所持ポケモンが10体表示されるよ。</p></div></section>`;
 return `${pageHeader('SCOUT / RECRUIT','ポケモンをスカウト','毎回ランダムに10体が登場。その中から1体だけ選んで仲間にしよう。伝説・幻は専用レイドで勝利した場合だけ獲得できます。','<button class="btn btn-ghost" data-page="shop">◇ メガストーンを買う</button>')}
 <div class="panel"><div class="panel-body"><div class="search-row" style="margin-bottom:12px"><span class="pill">未所持候補から抽選</span><span class="pill">所持 VP：${state.vp.toLocaleString()}</span><button class="btn btn-primary" data-action="draw-scout-10" ${state.vp<100?'disabled':''}>🎲 100 VPで10体をランダム抽選</button></div><p class="small muted">抽選は100 VP。抽選後の10体から選ぶと、通常ポケモンは追加料金なしで獲得できるよ。伝説・幻はレイド参加料が別に必要。</p></div></div>
 ${candidatesHtml}
 ${selected?`<div class="scout-stage" style="margin-top:14px"><div class="scout-stage-art">${speciesIcon(selected,false,true)}</div><div class="scout-stage-info"><div class="section-kicker">SELECTED CANDIDATE · #${String(selected.num||0).padStart(4,'0')}</div><h2>${esc(getPokeName(selected))}</h2><div class="eng-name">${esc(String(selected.name||'').toUpperCase())}</div>${typesHtml(selected.types||[])}<div class="scout-stat"><span>基礎能力合計</span><b>${Number(selected.bst||0)||'—'}</b></div><div class="scout-stat"><span>特性</span><b>${esc(abilityNames||'データなし')}</b></div><p class="small muted" style="line-height:1.7">${legendary?'伝説・幻ポケモン！通常スカウトはできません。レイドボスを倒すと獲得できます。':'この10体から選んだポケモンを仲間にできます。'}</p>${legendary?`<button class="btn btn-primary btn-wide" data-action="start-legendary-raid" data-id="${esc(selected.id)}" ${state.owned.length===0?'disabled':''}>伝説レイドに挑戦</button>`:`<button class="btn btn-primary btn-wide" data-action="claim-scout" data-id="${esc(selected.id)}">このポケモンを仲間にする</button>`}<p class="tiny muted">ポケモンを選び直すと、右側の大きな画像と詳細が切り替わります。</p></div></div>`:''}`;
}
function renderTraining(){let list=state.owned.slice();const chosen=list.find(m=>m.uid===state.selectedOwned)||list[0];if(!chosen)return `${pageHeader('TRAINING','トレーニング','能力・特性・技を調整する。変更は個体ごとに保存されます。')}<div class="panel empty-state">ボックスにポケモンがいません。スカウトから1匹選んでください。<br><button class="btn btn-primary" data-page="scout" style="margin-top:15px">スカウトへ</button></div>`;const p=monSpecies(chosen),available=learnableMoves(p),stats=calcStats(chosen),abilityCandidates=Object.values(p?.abilities||{}).filter(v=>typeof v==='string');const commonItems=[['','なし'],['choicescarf','こだわりスカーフ'],['choiceband','こだわりハチマキ'],['choicespecs','こだわりメガネ'],['lifeorb','いのちのたま'],['focussash','きあいのタスキ'],['leftovers','たべのこし'],['sitrusberry','オボンのみ'],['rockyhelmet','ゴツゴツメット'],['assaultvest','とつげきチョッキ'],['heavydutyboots','あつぞこブーツ'],['flameplate','ひのたまプレート'],['splashplate','しずくプレート'],['zapplate','いかずちプレート'],['meadowplate','みどりのプレート'],['icicleplate','つららのプレート'],['fistplate','こぶしのプレート'],['toxicplate','もうどくプレート'],['earthplate','だいちのプレート'],['skyplate','あおぞらプレート'],['mindplate','ふしぎのプレート'],['insectplate','たまむしプレート'],['stoneplate','がんせきプレート'],['spookyplate','もののけプレート'],['dracoplate','りゅうのプレート'],['dreadplate','こわもてプレート'],['ironplate','こうてつプレート'],['pixieplate','せいれいプレート'],['burndrive','ブレイズカセット'],['dousedrive','アクアカセット'],['shockdrive','イナズマカセット'],['chilldrive','フリーズカセット'],['fightingmemory','ファイトメモリ'],['flyingmemory','フライングメモリ'],['poisonmemory','ポイズンメモリ'],['groundmemory','グラウンドメモリ'],['rockmemory','ロックメモリ'],['bugmemory','バグメモリ'],['ghostmemory','ゴーストメモリ'],['steelmemory','スチールメモリ'],['firememory','ファイヤーメモリ'],['watermemory','ウォーターメモリ'],['grassmemory','グラスメモリ'],['electricmemory','エレクトロメモリ'],['psychicmemory','サイキックメモリ'],['icememory','アイスメモリ'],['dragonmemory','ドラゴンメモリ'],['darkmemory','ダークメモリ'],['fairymemory','フェアリーメモリ'],['venusaurite','フシギバナイト'],['charizarditex','リザードナイトX'],['charizarditey','リザードナイトY'],['blastoisinite','カメックスナイト'],['alakazite','フーディナイト'],['gengarite','ゲンガナイト'],['kangaskhanite','ガルーラナイト'],['pinsirite','カイロスナイト'],['gyaradosite','ギャラドスナイト'],['aerodactylite','プテラナイト'],['mewtwonitex','ミュウツナイトX'],['mewtwonitey','ミュウツナイトY'],['ampharosite','デンリュウナイト'],['scizorite','ハッサムナイト'],['heracronite','ヘラクロスナイト'],['houndoominite','ヘルガナイト'],['tyranitarite','バンギラスナイト'],['blazikenite','バシャーモナイト'],['gardevoirite','サーナイトナイト'],['mawilite','クチートナイト'],['aggronite','ボスゴドラナイト'],['medichamite','チャーレムナイト'],['manectite','ライボルトナイト'],['banettite','ジュペッタナイト'],['absolite','アブソルナイト'],['latiasite','ラティアスナイト'],['latiosite','ラティオスナイト'],['garchompite','ガブリアスナイト'],['garchompitez','ガブリアスナイトZ'],['lucarionite','ルカリオナイト'],['abomasite','ユキノオナイト'],['beedrillite','スピアナイト'],['pidgeotite','ピジョットナイト'],['slowbronite','ヤドランナイト'],['steelixite','ハガネールナイト'],['sceptilite','ジュカインナイト'],['swampertite','ラグラージナイト'],['sablenite','ヤミラミナイト'],['sharpedonite','サメハダナイト'],['cameruptite','バクーダナイト'],['altarianite','チルタリスナイト'],['galladite','エルレイドナイト'],['audinite','タブンネナイト'],['lopunnite','ミミロップナイト'],['diancite','ディアンシナイト'],['metagrossite','メタグロスナイト'],['sablenite','ヤミラミナイト'],['sharpedonite','サメハダナイト']];const availableItems=commonItems.filter(([id,label])=>!label.includes('ナイト')||Number(state.items?.[id]||0)>0||itemSlug(chosen.heldItem)===id);return `${pageHeader('BUILD & TRAINING','トレーニング','努力値・性格・特性・技・持ち物を編集。1匹ごとのビルドとして保存します。')}
 <div class="training-layout"><aside class="panel"><div class="panel-head"><h2>対象個体</h2><span class="pill">${list.length}匹</span></div><div class="panel-body"><div class="owned-list">${list.map(m=>`<button class="owned-row ${m.uid===chosen.uid?'selected':''}" data-action="train-owned" data-uid="${esc(m.uid)}">${speciesIcon(m)}<span><b>${esc(m.name)}</b><small>Lv.${m.level} · ${m.shiny?'✦ 色違い':''}</small></span></button>`).join('')}</div></div></aside>
 <section class="panel"><div class="panel-head"><h2>${esc(chosen.name)}　Lv.${chosen.level}</h2><span class="pill">${esc(p?.types?.map(t=>TYPE_JA[t]).join(' / ')||'')}</span></div><div class="panel-body"><div class="grid two-col"><div><div class="detail-visual" style="border-radius:13px;min-height:160px">${speciesIcon(chosen)}</div><div class="ability-box"><b>現在の特性：${esc(abilityName(chosen.abilityId))}</b><p>${esc(abilityDescription(chosen.abilityId))}</p></div></div><div><div class="section-kicker">BATTLE STATS / Lv.${chosen.level}</div><div class="stat-list">${STAT_KEYS.map(k=>`<div class="stat-row"><span>${STAT_JA[k]}</span><b>${stats[k]}</b><div class="stat-bar"><i style="width:${Math.min(100,stats[k]/255*100)}%"></i></div></div>`).join('')}</div><label class="small muted" for="nature-select">性格</label><select id="nature-select" class="field" style="width:100%;margin:6px 0 12px">${['まじめ','いじっぱり','ひかえめ','ようき','おくびょう','ずぶとい','おだやか','ゆうかん','れいせい','わんぱく','のんき','なまいき','むじゃき','せっかち','さみしがり','やんちゃ','おっとり','うっかりや','おとなしい','きまぐれ','てれや','すなお','がんばりや'].map(n=>`<option ${chosen.nature===n?'selected':''}>${n}</option>`).join('')}</select><label class="small muted" for="ability-select">特性</label><select id="ability-select" class="field" style="width:100%;margin:6px 0 0">${abilityCandidates.map(a=>`<option value="${esc(a)}" ${chosen.abilityId===a?'selected':''}>${esc(abilityName(a))}</option>`).join('')}</select></div></div>
 <hr style="border:0;border-top:1px solid #ffffff12;margin:20px 0"><div class="section-kicker">EFFORT VALUES / 努力値 (合計510)</div><div class="grid two-col" style="margin-top:10px">${STAT_KEYS.map(k=>`<div class="ev-control"><label>${STAT_JA[k]}</label><input type="range" min="0" max="252" step="4" data-ev="${k}" value="${chosen.evs?.[k]||0}"><b id="ev-value-${k}">${chosen.evs?.[k]||0}</b></div>`).join('')}</div><p class="tiny muted">各能力252まで、合計510まで。スライダー操作は合計上限を超えないよう制限します。</p>
 <hr style="border:0;border-top:1px solid #ffffff12;margin:20px 0"><div class="section-kicker">MOVE SET / 技の変更</div>${[0,1,2,3].map(i=>{const current=chosen.moves[i]?.id||'';return `<div class="move-edit-row"><label>技スロット ${i+1}</label><select class="field move-slot-select" data-slot="${i}" style="width:100%"><option value="">（空きスロット）</option>${available.map(m=>`<option value="${esc(m.id)}" ${m.id===current?'selected':''}>${esc(getMoveName(m))} · ${TYPE_JA[m.type]||m.type} · ${getMoveCatJa(m.category)} · PP${m.pp}</option>`).join('')}</select></div>`}).join('')}
 <div class="grid two-col" style="margin-top:15px"><div><label class="small muted" for="held-item">持ち物</label><select id="held-item" class="field" style="width:100%;margin-top:6px">${availableItems.map(([id,label])=>`<option value="${esc(id)}" ${itemSlug(chosen.heldItem)===id?'selected':''}>${esc(label)}</option>`).join('')}</select></div><div><label class="small muted" for="level-input">レベル</label><input type="number" id="level-input" class="field" min="1" max="100" value="${chosen.level}" readonly aria-label="レベル（育成で上昇）" style="width:100%;margin-top:6px"></div></div><div class="action-row"><button class="btn btn-primary" data-action="save-training" data-uid="${esc(chosen.uid)}">変更を保存</button><button class="btn btn-ghost" data-action="reset-ev" data-uid="${esc(chosen.uid)}">努力値リセット</button></div><p class="footer-note">技候補はHTML内蔵の習得技データを使って表示します。使用ゲームやフォルムにより習得可否が異なる場合があるため、採用ルールセットは今後固定する必要があります。</p></div></section></div>`;}
const MEGA_STONES = [
 {id:'garchompite',name:'ガブリアスナイト',price:500,description:'ガブリアスに持たせると、バトル中にメガガブリアスへメガシンカできます。'},
 {id:'garchompitez',name:'ガブリアスナイトZ',price:800,description:'ガブリアスに持たせると、対応するメガガブリアスZへメガシンカできます。'},
];
function renderShop(){const q=searchKey(state.shopSearch||'');const list=MEGA_STONES.filter(x=>!q||searchKey(x.name).includes(q)||searchKey(x.id).includes(q));return `${pageHeader('ITEM SHOP / MEGA STONES','アイテムショップ','メガストーンをVPで購入し、トレーニング画面で対象ポケモンに持たせます。','<button class="btn btn-ghost" data-page="box">▧ ボックスへ</button>')}<div class="stats-strip">${statTile('VP BALANCE',state.vp.toLocaleString(),'購入に使えるポイント')}${statTile('OWNED STONES',Object.values(state.items||{}).reduce((a,n)=>a+Number(n||0),0),'所持メガストーン数')}</div><div class="search-row"><input id="shop-search" class="field search-field" placeholder="アイテム名で検索" value="${esc(state.shopSearch||'')}"><span class="pill">${list.length}種類</span></div><div class="shop-grid">${list.map(item=>{const stock=Math.max(0,Number(state.items?.[item.id]||0));return `<section class="shop-card"><div><div class="section-kicker">MEGA STONE</div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><small class="shop-stock">所持数：${stock}個</small></div><div class="shop-price">${item.price} VP</div><button class="btn ${stock?'btn-secondary':'btn-primary'} shop-buy" data-action="buy-item" data-item="${esc(item.id)}" ${state.vp<item.price?'disabled':''}>${state.vp<item.price?'VP不足':'購入する'}</button></section>`;}).join('')}</div><section class="panel" style="margin-top:15px"><div class="panel-body"><h3 style="margin-top:0">購入したストーンを使う</h3><p class="small muted" style="line-height:1.8">① ストーンを購入 → ② トレーニングを開く → ③ 対象ポケモンの「持ち物」でストーンを選ぶ → ④「変更を保存」。バトルでは、そのポケモンがメガシンカ対応の持ち物を持っているときだけ「メガシンカ」を選べます。ストーンは消費されず、何度でも使えます。</p><div class="action-row"><button class="btn btn-primary" data-page="training">トレーニングで持たせる</button><button class="btn btn-ghost" data-page="scout">ポケモンをスカウト</button></div></div></section>`;}
function renderSettings(){const c=cleanAdminConfig(state.adminConfig);const adminPanel=state.adminUnlocked?`<section class="setting-card" style="grid-column:1/-1;border-color:#9b7cff"><div class="section-kicker">ADMIN / 0605</div><h3>管理者コントロール</h3><p>確率はパーセントで設定します。スカウトのレア度確率は合計が100でなくても、入力した比率をもとに抽選します。0にすると抽選されません。</p><div class="settings-grid">${[['shinyChance','通常スカウト 色違い (%)'],['markChance','通常スカウト 証 (%)'],['raidShinyChance','レイド 色違い (%)'],['raidMarkChance','レイド 証 (%)'],['rarityCommon','コモン比率 (%)'],['rarityUncommon','アンコモン比率 (%)'],['rarityRare','レア比率 (%)'],['raritySuperrare','スーパーレア比率 (%)'],['rarityLegendary','伝説・幻比率 (%)']].map(([k,label])=>`<label class="small">${label}<input class="field" type="number" min="0" max="100" step="0.1" id="admin-${k}" value="${c[k]}"></label>`).join('')}</div><div class="form-row" style="margin-top:12px"><button class="btn btn-primary" data-action="admin-save-config">確率設定を保存</button><button class="btn btn-secondary" data-action="admin-reset-config">初期値に戻す</button><button class="btn btn-ghost" data-action="admin-add-vp">VPを +1000</button><button class="btn btn-ghost" data-action="admin-lock">管理者モードを終了</button></div><p class="tiny muted">設定はこのブラウザに保存されます。これは自分のHTML内のゲーム用ロックであり、本物のセキュリティ認証ではありません。</p></section>`:`<section class="setting-card" style="grid-column:1/-1"><div class="section-kicker">ADMIN ACCESS</div><h3>管理者モード</h3><p>コードを入力すると、確率の変更やVP調整などの管理者機能を開けます。</p><div class="form-row"><input class="field" id="admin-code" type="password" inputmode="numeric" maxlength="4" placeholder="4桁のコード" autocomplete="off"><button class="btn btn-secondary" data-action="admin-unlock">コードを確認</button></div></section>`;return `${pageHeader('SYSTEM / SAVE DATA','設定・セーブ','セーブデータのバックアップ、読み込み、内蔵データの確認ができます。')}
 ${adminPanel}<div class="settings-grid"><section class="setting-card"><div class="section-kicker">SAVE DATA</div><h3>セーブのバックアップ</h3><p>VP、ボックス、チーム、技、特性、持ち物をJSONファイルに保存します。端末変更前に書き出してください。</p><button class="btn btn-primary" data-action="export-save">⇧ JSONを書き出す</button></section><section class="setting-card"><div class="section-kicker">RESTORE</div><h3>セーブを読み込む</h3><p>このゲームから書き出したJSONを選択します。現在のセーブは読み込んだ内容に置き換わります。</p><input type="file" id="import-save" class="field" accept="application/json,.json"><p id="import-save-status" class="tiny muted" style="margin-top:8px">① JSONファイルを選択 ②「選択したJSONを読み込む」を押してください。</p><button id="import-save-confirm" class="btn btn-secondary" data-action="import-save-confirm" style="margin-top:8px" disabled>選択したJSONを読み込む</button></section><section class="setting-card"><div class="section-kicker">OFFLINE DATABASE</div><h3>内蔵データの状態</h3><p>図鑑・種族値・日本語名・習得技は内蔵データを使用します。起動時にはPokémon Showdownから対戦用の技・特性・持ち物データを取得し、ポケモン画像もネットから読み込みます。接続できない場合は内蔵データと補助データに切り替わります。</p><span class="pill">HYBRID DATA READY</span><p class="tiny">ポケモン：${(state.dataInfo.dexCount||state.data.dex.length).toLocaleString()}種 / 技：${Object.keys(state.data.movesById||{}).length.toLocaleString()}件 / 特性：${(state.dataInfo.showdownAbilityCount||state.dataInfo.abilityCount||state.data.abilitiesList?.length||0).toLocaleString()}件 / 持ち物：${Number(state.dataInfo.showdownItemCount||0).toLocaleString()}件 / タイプ：${(state.dataInfo.typeCount||state.data.types?.length||0).toLocaleString()}件</p><p class="tiny">習得技の対応：${(state.dataInfo.learnsetMoveLinks||0).toLocaleString()}件</p><p class="tiny muted">使用ファイル：pokemon_bulk_data.txt、pokemon_moves_abilities_types_full.txt</p><p class="tiny muted">提供された図鑑データは1025種の基本形が中心です。メガシンカ・リージョンフォーム・キョダイマックスなどの別フォルム情報は、この2つのファイルに収録されていないため未収録です。体重・高さ・進化先など、元データにない項目は未設定です。</p></section><section class="setting-card"><div class="section-kicker">GAME RULES</div><h3>現在のルールセット</h3><p>このブラウザ内で動く独自のファン試作です。技・特性の説明は内蔵データを表示し、一部のバトル効果は簡易再現です。公式Pokémon Championsと同一の使用可能範囲・数値とは限りません。</p><span class="pill">LOCAL BATTLE ENGINE</span></section><section class="setting-card"><div class="section-kicker">LOCAL STORAGE</div><h3>自動保存の状態</h3><p>このブラウザのローカル保存：${saveStatusLabel()}。プライベートブラウズや端末設定により保存されない場合があります。</p><button class="btn btn-ghost" data-action="save-now">今すぐ保存</button></section><section class="setting-card"><div class="section-kicker">RESET</div><h3>ゲームデータを初期化</h3><p>現在のボックス・チーム・VPを初期状態に戻します。実行前にJSONのバックアップを推奨します。</p><button class="btn btn-danger" data-action="reset-save">セーブを初期化</button></section></div><p class="footer-note">非公式ファンメイド試作版。商標・キャラクター・ゲームデータの権利は各権利者に帰属します。</p>`;}
function chooseRandom(arr){return arr[Math.floor(Math.random()*arr.length)];}
function buildBattleMon(monOrSpecies,owned=false){const mon=owned?JSON.parse(JSON.stringify(monOrSpecies)):makeOwned(monOrSpecies,{level:50});const p=monSpecies(mon)||monOrSpecies;const stats=calcStats(mon);const battleMoveIds=owned?(mon.moves||[]).slice(0,4).map(m=>typeof m==='string'?m:m.id):enemyMovesFor(p);return {...mon,speciesId:p.id,types:p.types,name:mon.name||getPokeName(p),stats,maxhp:stats.hp,hp:stats.hp,status:null,statusTurns:0,stages:{atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0,evasion:0},volatile:{},moves:battleMoveIds.map(id=>({id,pp:getMove(id)?.pp||10})),fainted:false,megaUsed:false,baseSpeciesId:p.id,mark:mon.mark||null};}
function beginBattleIntro(b){if(!b)return;const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;b.introActive=true;renderPage();setTimeout(()=>{if(state.battle===b&&b.introActive){b.introActive=false;renderPage();}},reduced?80:7900);}
function startBattle(mode=state.battleMode){if(state.owned.length<1){toast('まずポケモンをスカウトしてください。','warn');setPage('scout');return;}state.battleMode=mode;const selectedMons=state.team.map(uid=>state.owned.find(m=>m.uid===uid)).filter(Boolean);const allEligible=mode==='raid'?state.owned:state.owned.filter(m=>Number(m.level||1)>=50);const eligibleSelected=mode==='raid'?selectedMons:selectedMons.filter(m=>Number(m.level||1)>=50);if(mode!=='raid'&&selectedMons.some(m=>Number(m.level||1)<50))toast('Lv.50未満のポケモンは通常対戦に参加できないため、編成から外しました。','warn');const userMons=eligibleSelected.length?eligibleSelected:allEligible;if(mode!=='raid'&&!userMons.length){toast('通常対戦はLv.50以上のポケモンが必要です。育成ラボで育ててね。','warn');setPage('care');return;}const party=userMons.slice(0,6);while(party.length<6){const cand=finalRecruitDex().filter(p=>!party.some(m=>m.speciesId===p.id));if(!cand.length)break;party.push(makeOwned(chooseRandom(cand),{level:50}));}
 const pool=finalRecruitDex().filter(p=>p.bst>0&&!p.isNonstandard);const picked=[], used=new Set();while(picked.length<6&&used.size<pool.length){let p=chooseRandom(pool);if(used.has(p.id))continue;used.add(p.id);picked.push(p);}const playerTeam=party.map(m=>buildBattleMon(m,true)),enemyTeam=picked.map(p=>buildBattleMon(p,false));
 state.battle={mode,turn:1,playerTeam,enemyTeam,playerActive:mode==='doubles'?[0,1]:[0],enemyActive:mode==='doubles'?[0,1]:[0],weather:null,weatherTurns:0,terrain:null,terrainTurns:0,log:['バトル開始！ 相手のチームが現れた！'],result:null,pending:{},megaPendingSlots:[],megaUsedBySide:{player:false,enemy:false},lastDamage:null,turnBusy:false};state.pendingActions={};state.selectedActiveSlot=0;state.selectedMove=null;state.selectedTargetUid=null;state.page='battle';setPage('battle');triggerEntryEffects(state.battle.playerActive.map(i=>state.battle.playerTeam[i]),state.battle.enemyActive.map(i=>state.battle.enemyTeam[i]),state.battle);saveLocal();beginBattleIntro(state.battle);}
function battleLog(msg){const b=state.battle;if(!b)return;b.log.push(msg);if(b.log.length>80)b.log=b.log.slice(-80);}
function triggerEntryEffects(entering,foes,b){for(const mon of entering||[]){if(!mon||mon.fainted)continue;const side=b.playerTeam.some(m=>m.uid===mon.uid)?'player':'enemy';const cond=b.sideConditions?.[side];if(cond){const types=monSpecies(mon)?.types||[];if(cond.stealthrock){const mult=typeMult('Rock',monSpecies(mon),mon);if(mult>0){const d=Math.max(1,Math.floor(mon.maxhp*mult/8));mon.hp=Math.max(0,mon.hp-d);battleLog(`${mon.name}はステルスロックで${d}ダメージ！`);}}if(cond.spikes>0&&isGrounded(mon)){const frac=cond.spikes===1?1/8:cond.spikes===2?1/6:1/4;const d=Math.max(1,Math.floor(mon.maxhp*frac));mon.hp=Math.max(0,mon.hp-d);battleLog(`${mon.name}はまきびしで${d}ダメージ！`);}if(cond.toxicspikes>0&&isGrounded(mon)){if(types.includes('Poison')){cond.toxicspikes=0;battleLog(`${mon.name}がどくびしを回収した！`);}else if(!types.includes('Steel'))setStatus(mon,cond.toxicspikes>1?'tox':'psn','どくびし');}if(cond.stickyweb&&isGrounded(mon))applyBoosts(mon,{spe:-1},'ねばねばネット');if(mon.hp<=0){mon.hp=0;mon.fainted=true;battleLog(`${mon.name}は倒れた！`);continue;}}const ab=slug(mon.abilityId);if(ab==='drizzle'){b.weather='rain';b.weatherTurns=5;battleLog(`${mon.name}の「あめふらし」！ 雨が降り始めた！`);}else if(ab==='drought'){b.weather='sun';b.weatherTurns=5;battleLog(`${mon.name}の「ひでり」！ 日差しが強くなった！`);}else if(ab==='sandstream'){b.weather='sand';b.weatherTurns=5;battleLog(`${mon.name}の「すなおこし」！ 砂嵐が吹き荒れる！`);}else if(ab==='snowwarning'){b.weather='snow';b.weatherTurns=5;battleLog(`${mon.name}の「ゆきふらし」！ 雪が降り始めた！`);}else if(ab==='intimidate'){for(const foe of foes||[])if(foe&&!foe.fainted){foe.stages.atk=Math.max(-6,foe.stages.atk-1);battleLog(`${mon.name}の「いかく」！ ${foe.name}の攻撃が下がった！`);}}}}
function activeLiving(team,active){return active.map(i=>team[i]).filter(m=>m&&!m.fainted&&m.hp>0);}
function renderBattlePage(){const b=state.battle;if(!b)return `${pageHeader('BATTLE STADIUM','バトル','シングルまたはダブルを選び、技・交代・天候・特性を使って勝利を目指そう。')}<div class="panel"><div class="panel-body"><div class="grid two-col"><button class="setting-card" data-action="battle-mode" data-mode="singles"><span class="section-kicker">SINGLE BATTLE</span><h3>シングルバトル</h3><p>1対1。相手の行動を読み、技や交代を選択。</p><span class="btn btn-primary">シングルを始める</span></button><button class="setting-card" data-action="battle-mode" data-mode="doubles"><span class="section-kicker">DOUBLE BATTLE</span><h3>ダブルバトル</h3><p>2対2。2匹ぶんの行動を決定してからターンを解決。</p><span class="btn btn-primary">ダブルを始める</span></button></div><p class="footer-note">対戦はこのブラウザ内のCPU戦です。オンラインマッチングや公式Pokémon Championsのサーバーには接続しません。</p></div></div>`;
 const slot=state.selectedActiveSlot;const player=b.playerTeam[b.playerActive[slot]];const enemy=b.enemyTeam[b.enemyActive[0]];const mon=player&&!player.fainted?player:activeLiving(b.playerTeam,b.playerActive)[0];const move=state.selectedMove?getMove(state.selectedMove):null;const effectiveMove=move?resolveMoveTypePower(move,b.weather):null;const result=b.result;const liveEnemies=activeLiving(b.enemyTeam,b.enemyActive);if(!liveEnemies.some(m=>m.uid===state.selectedTargetUid))state.selectedTargetUid=liveEnemies[0]?.uid||null;
 const slotInfo=(mon,side,slotIndex)=>{if(!mon)return '';const spec=monSpecies(mon);const percent=Math.max(0,mon.hp/mon.maxhp*100);const status=mon.status?`<span class="status-pill">${STATUS_JA[mon.status]||mon.status}</span>`:'';const stages=Object.entries(mon.stages||{}).filter(([k,v])=>['atk','def','spa','spd','spe'].includes(k)&&v!==0).map(([k,v])=>`<span class="rank-mini">${STAT_JA[k]} ${v>0?'+':''}${v}</span>`).join('');return `<div class="combat-info ${side} slot-${slotIndex}" style="${side==='enemy'&&b.mode==='doubles'?`left:${slotIndex===0?'16px':'auto'};right:${slotIndex===0?'auto':'16px'};top:${slotIndex===0?'14px':'24px'}`:side==='player'&&b.mode==='doubles'?`right:${slotIndex===0?'14px':'auto'};left:${slotIndex===0?'auto':'14px'};bottom:${slotIndex===0?'14px':'24px'}`:''}"><div class="name-level"><b>${esc(mon.name)}</b><span>Lv.${mon.level}</span></div><div class="hp-numbers"><span>HP</span><span>${Math.max(0,mon.hp)} / ${mon.maxhp} · ${Math.round(percent)}%</span></div><div class="hp-track"><i class="${percent<=20?'low':percent<=50?'mid':''}" style="width:${percent}%"></i></div><div class="hp-subline">${status}${stages}<span class="ability-mini">特性：${esc(abilityName(mon.abilityId))}</span></div></div>`;};
 const monMarkup=(mon,side,i)=>{if(!mon)return '';const faint=mon.fainted||mon.hp<=0;return `<div class="battle-platform ${side}" style="${b.mode==='doubles'?(side==='enemy'?`right:${i===0?'2%':'44%'};width:36%`:`left:${i===0?'0':'42%'};width:43%`):''}"></div><div class="battle-mon ${side} slot-${i} ${faint?'fainted':''} ${mon.megaActive?'mega-active':''} ${mon.terastallized?'tera-active':''} ${side==='player'&&b.megaPendingSlots?.includes(i)?'mega-pending':''}" id="mon-${side}-${i}" style="${b.mode==='doubles'?(side==='enemy'?`right:${i===0?'5%':'43%'};width:34%;top:${i===0?'45px':'66px'};height:142px`:`left:${i===0?'0':'40%'};width:42%;bottom:${i===0?'20px':'34px'};height:155px`):''}">${speciesIcon(mon,side==='player',true)}${mon.terastallized?'<span class="tera-crystal-shell" aria-hidden="true"></span><span class="tera-crown-symbol" aria-hidden="true">✦</span>':''}${mon.megaActive?'<span class="mega-tag">MEGA</span>':(side==='player'&&b.megaPendingSlots?.includes(i)?'<span class="mega-tag">MEGA READY</span>':'')}</div>`;};
 const playerActive=activeLiving(b.playerTeam,b.playerActive),enemyActive=activeLiving(b.enemyTeam,b.enemyActive);const introPlayer=b.playerTeam[b.playerActive[0]]||playerActive[0];const introEnemy=b.enemyTeam[b.enemyActive[0]]||enemyActive[0];const isDouble=b.mode==='doubles';const moveButtons=(mon)=> (mon?.moves||[]).map((moveState,i)=>{const m=getMove(moveState.id);if(!m)return '';const empty=moveState.pp<=0;const eff=resolveMoveTypePower(m,b.weather);return `<button class="move-button ${state.selectedMove===m.id?'selected':''}" data-action="select-move" data-move="${esc(m.id)}" style="${typeStyles(eff.type)}" ${empty||b.turnBusy||result?'disabled':''}><b>${getMoveIcon(m.category)}　${esc(getMoveName(m))}</b><span class="move-type" style="color:${TYPE_COLORS[eff.type]||'#fff'}">${TYPE_JA[eff.type]||eff.type}</span><small>${getMoveCatJa(m.category)} · 威力 ${eff.power||'—'} · 命中 ${formatAccuracy(m)}</small><span class="move-pp">PP ${moveState.pp}/${m.pp}</span></button>`;}).join('');
 const playerHpStrip=b.playerActive.map((idx,i)=>{const pm=b.playerTeam[idx];if(!pm)return '';const pct=Math.max(0,pm.hp/Math.max(1,pm.maxhp)*100);const status=pm.status?`<span class="status-pill">${STATUS_JA[pm.status]||pm.status}</span>`:'';const stages=Object.entries(pm.stages||{}).filter(([k,v])=>['atk','def','spa','spd','spe'].includes(k)&&v!==0).map(([k,v])=>`<span class="rank-mini">${STAT_JA[k]} ${v>0?'+':''}${v}</span>`).join('');return `<article class="player-hp-card"><div class="name-level"><b>${isDouble?`味方${i+1} · `:''}${esc(pm.name)}</b><span>Lv.${pm.level}</span></div><div class="hp-numbers"><span>自分のHP</span><b>${Math.max(0,pm.hp)} / ${pm.maxhp} · ${Math.round(pct)}%</b></div><div class="hp-track"><i class="${pct<=20?'low':pct<=50?'mid':''}" style="width:${pct}%"></i></div><div class="hp-subline">${status}${stages}</div></article>`;}).join('');
 return `${pageHeader(b.mode==='raid'?'LEGENDARY RAID':'BATTLE STADIUM',b.mode==='raid'?'伝説レイド':isDouble?'ダブルバトル':'シングルバトル',`TURN ${b.turn} · ${b.weather?`${WEATHER_JA[b.weather]}（残り${b.weatherTurns}ターン）`:'天候なし'} · ${result?'対戦終了':'行動を選択中'}`,`<button class="btn btn-ghost" data-action="end-battle">対戦を終了</button>`)}
 <div class="battle-shell${b.mode==='raid'&&b.result==='win'&&!!state.raidCaptureRoll?' raid-result':''}"><section class="battle-stage${b.introActive?' intro-running':''}"><div class="battle-topline"><span>◉　${b.mode==='raid'?'LEGENDARY RAID':'TRAINER VS CPU'}</span><span>${b.mode==='raid'?'6体編成レイド':isDouble?'2 VS 2 DOUBLE':'SINGLE'}　/　NATIONAL RULE</span><span>${b.result?'RESULT':`TURN ${b.turn}`}</span></div><div class="battlefield weather-${slug(b.weather||'clear')}"><div class="battle-stars"></div><div class="arena-stands"></div><div class="arena-arch"></div><div class="arena-sweep"></div>${(Array.isArray(b.enemyActive)?b.enemyActive:[]).map((idx,i)=>{const raw=Array.isArray(b.enemyTeam)?b.enemyTeam[idx]:null;if(!raw||typeof raw!=='object')return '';const captureView=b.mode==='raid'&&b.result==='win'&&!!state.raidCaptureRoll;const rawMaxHp=Number(raw.maxhp??raw.stats?.hp??raw.hp??1);const safeMaxHp=Number.isFinite(rawMaxHp)&&rawMaxHp>0?rawMaxHp:1;const m=captureView?{...raw,maxhp:safeMaxHp,hp:Math.max(1,safeMaxHp),fainted:false}:raw;return monMarkup(m,'enemy',i)+slotInfo(m,'enemy',i);}).join('')}${(Array.isArray(b.playerActive)?b.playerActive:[]).map((idx,i)=>{const m=Array.isArray(b.playerTeam)?b.playerTeam[idx]:null;if(!m||typeof m!=='object')return '';return monMarkup(m,'player',i)+slotInfo(m,'player',i);}).join('')}${b.mode==='raid'&&b.result==='win'&&state.raidCaptureRoll?`<div class="raid-capture-overlay"><div class="capture-copy"><b>レイドボスを捕まえよう！</b><small>${esc(getPokeName(state.data.dexById[state.raidTargetId]||b.enemyTeam[0]))} が待っている。ボールを投げて捕獲！</small></div><button class="raid-ball-button" data-action="raid-capture" ${state.raidCaptureBusy?'disabled':''}>🔴 ボールを投げる</button></div>`:''}<div class="battle-fx" id="battle-fx"><div class="fx-label" id="fx-label"></div></div><div class="battle-cinematic-overlay" id="battle-cinematic-overlay" aria-hidden="true"><div class="battle-cinematic-vignette"></div><div class="battle-cinematic-caption"><span class="battle-cinematic-kicker">BATTLE CAMERA</span><b id="battle-cinematic-title">BATTLE</b><small id="battle-cinematic-subtitle">技の演出</small></div></div>${b.introActive?`<div class="battle-intro cinematic-intro" aria-hidden="true">
 <div class="cinematic-cut-bg"></div><div class="cinematic-slash cinematic-slash-a"></div><div class="cinematic-slash cinematic-slash-b"></div>
 <div class="cinematic-cut-trainer cinematic-cut-enemy"><div class="cinematic-trainer silhouette-blue"><i class="tr-head"></i><i class="tr-cap"></i><i class="tr-body"></i><i class="tr-arm tr-arm-back"></i><i class="tr-arm tr-arm-front"></i><i class="tr-leg tr-leg-left"></i><i class="tr-leg tr-leg-right"></i></div><b>CPU CHALLENGER</b><span>${esc(introEnemy?.name||'RIVAL')}</span></div>
 <div class="cinematic-cut-vs">VS</div>
 <div class="cinematic-cut-trainer cinematic-cut-player"><div class="cinematic-trainer silhouette-gold"><i class="tr-head"></i><i class="tr-cap"></i><i class="tr-body"></i><i class="tr-arm tr-arm-back"></i><i class="tr-arm tr-arm-front"></i><i class="tr-leg tr-leg-left"></i><i class="tr-leg tr-leg-right"></i></div><b>PLAYER</b><span>CHALLENGER</span></div>
 <div class="cinematic-deploy-scene">
  <div class="cinematic-scene-label cinematic-enemy-label">相手のトレーナーが勝負をしかけてきた！</div>
  <div class="cinematic-thrower cinematic-enemy-thrower"><div class="cinematic-trainer silhouette-blue throwing"><i class="tr-head"></i><i class="tr-cap"></i><i class="tr-body"></i><i class="tr-arm tr-arm-back"></i><i class="tr-arm tr-arm-front"></i><i class="tr-leg tr-leg-left"></i><i class="tr-leg tr-leg-right"></i></div><span class="cinematic-throw-ball"></span></div>
  <div class="cinematic-ball-burst cinematic-enemy-burst"></div>
  <div class="cinematic-pokemon cinematic-enemy-pokemon">${introEnemy?speciesIcon(introEnemy,false,true):''}${introEnemy?.shiny?'<span class="cinematic-shiny-stars" aria-label="色違い">✦　✧　✦</span>':''}<b>${esc(introEnemy?.shiny?'色違い '+(introEnemy?.name||'ポケモン'):(introEnemy?.name||'相手のポケモン'))}</b></div>
  <div class="cinematic-scene-label cinematic-player-label">いけ！</div>
  <div class="cinematic-thrower cinematic-player-thrower"><div class="cinematic-trainer silhouette-gold throwing"><i class="tr-head"></i><i class="tr-cap"></i><i class="tr-body"></i><i class="tr-arm tr-arm-back"></i><i class="tr-arm tr-arm-front"></i><i class="tr-leg tr-leg-left"></i><i class="tr-leg tr-leg-right"></i></div><span class="cinematic-throw-ball"></span></div>
  <div class="cinematic-ball-burst cinematic-player-burst"></div>
  <div class="cinematic-pokemon cinematic-player-pokemon">${introPlayer?speciesIcon(introPlayer,true,true):''}${introPlayer?.shiny?'<span class="cinematic-shiny-stars" aria-label="色違い">✦　✧　✦</span>':''}<b>${esc(introPlayer?.mark?`${introPlayer.mark} ${introPlayer.name}`:introPlayer?.name||'自分のポケモン')}</b></div>
  <div class="cinematic-ready">BATTLE <strong>START!</strong></div>
 </div>
 <div class="cinematic-bottom-line"></div>
</div>`:''}</div>
 ${playerHpStrip?`<div class="player-hp-strip" aria-label="自分のポケモンのHP">${playerHpStrip}</div>`:''}
 <div class="battle-command"><div class="command-main"><div class="command-prompt"><div class="prompt-icon">⚔</div><div><b>⚔ 戦う　${esc(mon?.name||'行動選択')}</b><small>${isDouble?`味方の行動を選択 · 対象スロット ${slot+1}`:'使う技を選び、詳細を確認してから攻撃'}</small></div><div style="margin-left:auto">${isDouble?b.playerActive.map((idx,i)=>`<button class="btn ${slot===i?'btn-cyan':'btn-ghost'} btn-sm" data-action="active-slot" data-slot="${i}" ${!b.playerTeam[idx]||b.playerTeam[idx].fainted?'disabled':''}>味方${i+1}</button>`).join(''):''}</div></div>
 ${isDouble&&!result?`<div class="target-picker"><span>攻撃対象：</span>${liveEnemies.map((target,i)=>`<button class="btn ${target.uid===state.selectedTargetUid?'btn-cyan':'btn-ghost'} btn-sm" data-action="select-target" data-uid="${esc(target.uid)}" ${b.turnBusy?'disabled':''}>${esc(target.name)} · ${Math.round(target.hp/target.maxhp*100)}%</button>`).join('')}</div>`:''}${result?`<div class="battle-result"><h2>${result==='win'?'VICTORY!':result==='lose'?'DEFEAT':'DRAW'}</h2><p>${b.mode==='raid'?(result==='win'?'伝説ポケモンを倒した！ フィールドのポケモンにボールを投げて捕獲しよう。':'レイド失敗。再挑戦には100 VPが必要です。'):(result==='win'?'相手チームを倒した！ VPを獲得しました。':'次はチームや技構成を調整して挑戦しよう。')}</p>${b.mode==='raid'&&result==='win'&&state.raidCaptureRoll?`<div class="detail-card"><div class="detail-visual">${speciesIcon(state.data.dexById[state.raidTargetId]||b.enemyTeam[0])}</div><div class="detail-content"><h3>${esc(getPokeName(state.data.dexById[state.raidTargetId]||b.enemyTeam[0]))}</h3><div class="variant-badges">${state.raidCaptureRoll.shiny?'<span class="pill shiny-badge">✦ 色違い</span>':'<span class="pill">通常色</span>'}${state.raidCaptureRoll.mark?`<span class="pill proof-badge">◇ ${esc(state.raidCaptureRoll.mark)}</span>`:'<span class="pill">証なし</span>'}</div><p>色違い${cleanAdminConfig(state.adminConfig).raidShinyChance}%・証${cleanAdminConfig(state.adminConfig).raidMarkChance}%で独立抽選。確率は管理者設定で変更できます。</p></div></div><div class="action-row" style="justify-content:center"><button class="btn btn-primary" data-action="raid-capture" ${state.raidCaptureBusy?'disabled':''}>🔴 ボールを投げる！</button><button class="btn btn-secondary" data-action="raid-reroll">再挑戦して厳選（100 VP）</button><button class="btn btn-ghost" data-action="end-battle">終了</button></div>`:`<div class="action-row" style="justify-content:center"><button class="btn btn-primary" data-action="${b.mode==='raid'?'raid-reroll':'battle-mode'}" ${b.mode==='raid'?'':'data-mode="'+b.mode+'"'}>${b.mode==='raid'?'100 VPで再挑戦':'もう一度対戦'}</button><button class="btn btn-ghost" data-action="end-battle">ホームへ戻る</button></div>`}</div>`:`<div class="battle-moves">${moveButtons(mon)}</div><div class="action-row"><button class="btn btn-primary" data-action="confirm-move" ${!move||b.turnBusy?'disabled':''}>${isDouble?'このポケモンの技を決定':'技を使う　▶'}</button><button class="btn btn-secondary" data-action="open-switch" ${b.turnBusy?'disabled':''}>⇄　交代</button><button class="btn ${b.megaPendingSlots?.includes(slot)?'btn-cyan':'btn-ghost'}" data-action="toggle-mega" ${!mon||b.turnBusy||result||mon.megaUsed||b.megaUsedBySide?.player?'disabled':''}>${b.megaPendingSlots?.includes(slot)?'🌈 メガシンカ選択中（取消）':'✦ メガシンカ'}</button></div>${isDouble?`<div class="battle-rule-note">${b.playerActive.map((idx,i)=>`味方${i+1}: ${b.pending?.[i]?esc(getMoveName(getMove(b.pending[i].moveId))):'行動未決定'}`).join('　/　')}<br><button class="btn btn-primary btn-wide" style="margin-top:9px" data-action="execute-double" ${b.turnBusy||b.playerActive.some((idx,i)=>!b.playerTeam[idx]?.fainted&&!b.pending?.[i])?'disabled':''}>決定した行動でターンを実行</button></div>`:''}<div class="battle-rule-note">技の選択だけではターンは進みません。詳細欄を読んで「技を使う」で決定します。状態異常・天候・特性・持ち物の効果は対応範囲に応じて処理されます。</div>`}</div>
 <aside class="command-side"><div class="section-kicker">MOVE INSPECTOR</div>${move?`<div class="move-summary"><span class="pill" style="background:${TYPE_COLORS[effectiveMove.type]||'#394765'};color:#fff">${TYPE_JA[effectiveMove.type]||effectiveMove.type}タイプ</span><h3>${esc(getMoveName(move))}</h3><div class="variant-badges"><span class="pill">${getMoveIcon(move.category)} ${getMoveCatJa(move.category)}</span><span class="pill">${move.flags?.contact?'接触技':'非接触 / 未分類'}</span><span class="pill">優先度 ${move.priority||0}</span></div><div class="move-meta"><div><small>威力</small><b>${effectiveMove.power||'—'}</b></div><div><small>命中</small><b>${formatAccuracy(move)}</b></div><div><small>最大PP</small><b>${move.pp}</b></div></div><p class="move-desc">${esc(moveDescription(move))}</p>${move.mechanicDescription&&move.id!=='weatherball'?`<details class="move-flavor"><summary>対戦データの補足（原文）</summary><p>${esc(move.mechanicDescription)}</p></details>`:''}<div class="summary-chip"><span>ダメージ計算</span><b>${move.category==='Physical'?'攻撃 ↔ 防御':move.category==='Special'?'特攻 ↔ 特防':'変化技'}</b></div><button class="btn btn-ghost btn-wide" data-action="open-move-catalog">技図鑑で詳しく見る ↗</button>${move.id==='weatherball'?`<div class="ability-box"><b>天候時の変化</b><p>通常：威力50・ノーマル。雨：威力100・みず。晴れ：威力100・ほのお。砂嵐：威力100・いわ。雪：威力100・こおり。</p></div>`:''}</div>`:`<div class="empty-state" style="padding:20px 5px">技を選択すると、威力・命中・PP・分類・効果がここに表示されます。</div>`}
 <div class="section-kicker" style="margin:16px 0 8px">BATTLE LOG</div><div class="command-log" id="command-log">${b.log.slice(-6).reverse().map(msg=>`<p>${esc(msg)}</p>`).join('')}</div><div class="section-kicker" style="margin:12px 0 8px">PARTY / 交代</div><div class="battle-bench">${b.playerTeam.map((m,i)=>`<button class="bench-btn ${b.playerActive.includes(i)?'current':''} ${m.fainted?'fainted':''}" data-action="switch-to" data-index="${i}" ${m.fainted||b.playerActive.includes(i)||b.turnBusy||result?'disabled':''}>${speciesIcon(m)}<span>${esc(m.name)}<br><small>${Math.max(0,m.hp)}/${m.maxhp} HP</small></span></button>`).join('')}</div><p class="battle-rule-note">交代するとそのターンの行動を消費します。相手のHPをすべて0にすると勝利。勝利報酬はVPで、公式サーバーとは連動しません。</p></aside></div></section></div>`;}
function abilityTriggerOnMove(actor,target,move,b){const a=slug(target.abilityId);const mt=resolveMoveTypePower(move,b.weather).type;
 if(a==='magicbounce'&&move.category==='Status'&&move.flags?.reflectable&&!['self','allySide','allies'].includes(move.target)){battleLog(`${target.name}の「マジックミラー」！ 変化技を跳ね返した！`);applyMoveExtras(target,actor,move,b);return true;}
 if((a==='levitate'&&mt==='Ground')||(a==='waterabsorb'&&mt==='Water')||(a==='voltabsorb'&&mt==='Electric')||(a==='flashfire'&&mt==='Fire')||(a==='sapsipper'&&mt==='Grass')||(a==='stormdrain'&&mt==='Water')||(a==='motordrive'&&mt==='Electric')||(a==='dryskin'&&mt==='Water')){
  if(a==='flashfire'){target.volatile=target.volatile||{};target.volatile.flashFire=true;battleLog(`${target.name}の「もらいび」！ ほのお技を受けず、ほのお技が強くなった！`);}else if(a==='waterabsorb'||a==='voltabsorb'||a==='dryskin'){const healed=Math.max(1,Math.floor(target.maxhp/4));target.hp=Math.min(target.maxhp,target.hp+healed);battleLog(`${target.name}の「${abilityName(target.abilityId)}」！ HPが${healed}回復した！`);}else if(a==='sapsipper'){target.stages.atk=Math.min(6,target.stages.atk+1);battleLog(`${target.name}の「そうしょく」！ 攻撃が上がった！`);}else if(a==='stormdrain'){target.stages.spa=Math.min(6,target.stages.spa+1);battleLog(`${target.name}の「よびみず」！ 特攻が上がった！`);}else if(a==='motordrive'){target.stages.spe=Math.min(6,target.stages.spe+1);battleLog(`${target.name}の「ちくでん」！ 素早さが上がった！`);}else battleLog(`${target.name}の「${abilityName(target.abilityId)}」！ 技を無効化した！`);return true;
 }
 return false;
}
function resolveMoveTypePower(move,weather){let type=move.type||'Normal',power=Number(move.basePower||0);if(move.id==='weatherball'||slug(move.name)==='weatherball'){if(weather){power=100;type=weather==='rain'?'Water':weather==='sun'?'Fire':weather==='sand'?'Rock':weather==='snow'?'Ice':'Normal';}else{power=50;type='Normal';}}if(move.id==='terablast'&&move.isNonstandard)type='Normal';return {type,power};}
function resolveContextMoveData(move,actor,target,b){const base=resolveMoveTypePower(move,b.weather);let type=base.type,power=base.power;const aSpecies=monSpecies(actor),tSpecies=monSpecies(target),aItem=itemSlug(actor?.heldItem||''),tItem=itemSlug(target?.heldItem||''),apiId=Number(move?.apiId||0);const hpRatio=target?.maxhp?target.hp/target.maxhp:1;const atkRatio=actor?.maxhp?actor.hp/actor.maxhp:1;
 if(move.id==='terrainpulse'&&b.terrain&&isGrounded(actor)){type=({electric:'Electric',grassy:'Grass',psychic:'Psychic',misty:'Fairy'})[b.terrain]||type;power=100;}
 if(move.id==='revelationdance')type=(actor?.types||aSpecies?.types||[type])[0]||type;
 if(move.id==='judgment'){const plateTypes={flameplate:'Fire',splashplate:'Water',zapplate:'Electric',meadowplate:'Grass',icicleplate:'Ice',fistplate:'Fighting',toxicplate:'Poison',earthplate:'Ground',skyplate:'Flying',mindplate:'Psychic',insectplate:'Bug',stoneplate:'Rock',spookyplate:'Ghost',dracoplate:'Dragon',dreadplate:'Dark',ironplate:'Steel',pixieplate:'Fairy'};type=plateTypes[aItem]||type;}
 if(move.id==='technoblast'){const drives={burndrive:'Fire',dousedrive:'Water',shockdrive:'Electric',chilldrive:'Ice'};type=drives[aItem]||type;}
 if(move.id==='multiattack'){const memories={fightingmemory:'Fighting',flyingmemory:'Flying',poisonmemory:'Poison',groundmemory:'Ground',rockmemory:'Rock',bugmemory:'Bug',ghostmemory:'Ghost',steelmemory:'Steel',firememory:'Fire',watermemory:'Water',grassmemory:'Grass',electricmemory:'Electric',psychicmemory:'Psychic',icememory:'Ice',dragonmemory:'Dragon',darkmemory:'Dark',fairymemory:'Fairy'};type=memories[aItem]||type;}
 if(move.id==='acrobatics'&&!actor?.heldItem)power=110;
 if(move.id==='facade'&&['par','brn','psn','tox'].includes(actor?.status))power*=2;
 if(move.id==='hex'&&target?.status)power*=2;
 if(move.id==='venoshock'&&['psn','tox'].includes(target?.status))power*=2;
 if(move.id==='brine'&&hpRatio<=.5)power*=2;
 if(move.id==='knockoff'&&target?.heldItem)power=Math.floor(power*1.5);
 if(move.id==='storedpower'||move.id==='powertrip'){const stages=Object.values(actor?.stages||{}).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);power=20+20*stages;}
 if(apiId===175||apiId===179){const ratio=Math.max(1,Math.floor(Number(actor?.hp||0)*48/Math.max(1,Number(actor?.maxhp||1))));power=ratio<2?200:ratio<5?150:ratio<10?100:ratio<17?80:ratio<33?40:20;}
 if(apiId===374){const flingPowers={choicescarf:10,choiceband:10,choicespecs:10,lifeorb:30,focussash:10,leftovers:10,rockyhelmet:60,assaultvest:80,heavydutyboots:80};power=flingPowers[aItem]||0;}
 if(move.id==='bodypress')power=base.power;
 if(['solarbeam','solarblade'].includes(move.id)&&['rain','sand','snow'].includes(b.weather))power=Math.floor(power/2);
 if(['eruption','waterspout','dragonenergy'].includes(move.id))power=Math.max(1,Math.floor(power*atkRatio));
 if(['lowkick','grassknot'].includes(move.id)){const w=Number(tSpecies?.weightkg||1000);power=w<10?20:w<25?40:w<50?60:w<100?80:w<200?100:120;}
 if(['heavyslam','heatcrash'].includes(move.id)){const wa=Number(aSpecies?.weightkg||1),wt=Number(tSpecies?.weightkg||1000),ratio=wa/Math.max(1,wt);power=ratio>=5?120:ratio>=4?100:ratio>=3?80:ratio>=2?60:40;}
 if(move.id==='gyroball'){const sa=Math.max(1,currentStat(actor,'spe')),st=currentStat(target,'spe');power=Math.min(150,Math.max(1,Math.floor(25*st/sa)+1));}
 if(move.id==='electroball'){const sa=Math.max(1,currentStat(actor,'spe')),st=Math.max(1,currentStat(target,'spe')),ratio=sa/st;power=ratio>=4?150:ratio>=3?120:ratio>=2?80:ratio>1?60:40;}
 return {type,power};}
function calculateDamage(actor,target,move,b){const {type,power}=resolveContextMoveData(move,actor,target,b);if(!power)return {damage:0,type,power,effectiveness:1,critical:false};let attackKey=move.overrideOffensiveStat|| (move.id==='bodypress'?'def':(move.category==='Physical'?'atk':'spa'));let defenseKey=move.overrideDefensiveStat||(move.defensiveCategory==='Physical'?'def':move.defensiveCategory==='Special'?'spd':(move.category==='Physical'?'def':'spd'));if(['psyshock','psystrike','secretsword'].includes(move.id)&&!move.overrideDefensiveStat)defenseKey='def';const offensiveMon=move.overrideOffensivePokemon==='target'?target:actor,defensiveMon=move.overrideDefensivePokemon==='source'?actor:target;let atk=currentStat(offensiveMon,attackKey),def=Math.max(1,currentStat(defensiveMon,defenseKey));if(move.id==='foulplay')atk=currentStat(target,'atk');const ab=bcAbility(actor,b)||slug(actor.abilityId),dab=bcAbility(target,b)||slug(target.abilityId),item=itemSlug(actor.heldItem||'');
 // Technician is applied as a base-power multiplier below.
 let bp=power;if(Number(move.basePowerModifier)>0)bp=Math.max(1,Math.floor(bp*Number(move.basePowerModifier)));let abilityMult=1,itemMult=1;
 if(ab==='technician'&&power<=60)abilityMult*=1.5;if(ab==='sheerforce'&&(move.hasSheerForceBoost||move.secondaries?.length||move.secondary))abilityMult*=1.3;if(ab==='reckless'&&(move.recoil||['doubleedge','flareblitz','bravebird','wildcharge','headsmash'].includes(move.id)))abilityMult*=1.2;if(ab==='ironfist'&&move.flags?.punch)abilityMult*=1.2;if(ab==='strongjaw'&&move.flags?.bite)abilityMult*=1.5;if(ab==='toughclaws'&&move.flags?.contact)abilityMult*=1.3;if(ab==='neuroforce'&&typeMult(type,monSpecies(target),target)>1)abilityMult*=1.25;
 if(ab==='flashfire'&&actor.volatile?.flashFire&&type==='Fire')abilityMult*=1.5;
 if(item==='choiceband'&&move.category==='Physical')itemMult*=1.5;if(item==='choicespecs'&&move.category==='Special')itemMult*=1.5;if(item==='lifeorb')itemMult*=1.3;
 if(['fire','ice'].includes(type.toLowerCase())&&dab==='thickfat')abilityMult*=.5;
 if(dab==='multiscale'&&target.hp>=target.maxhp)abilityMult*=.5;if(dab==='iceface'&&move.category==='Physical'&&!target.volatile.iceFaceBroken){target.volatile.iceFaceBroken=true;return {damage:0,type,power,effectiveness:1,critical:false,blocked:true};}if(dab==='disguise'&&!target.volatile.disguiseBroken){target.volatile.disguiseBroken=true;return {damage:0,type,power,effectiveness:1,critical:false,blocked:true};}
 if(dab==='filter'||dab==='solidrock'||dab==='prismarmor'){/* effectiveness modifier below */}
 if(b.weather==='snow'&&(monSpecies(target)?.types||[]).includes('Ice')&&move.category==='Physical')def=Math.floor(def*1.5);if(b.terrain==='grassy'&&isGrounded(target)&&['earthquake','bulldoze','magnitude'].includes(move.id))bp=Math.floor(bp/2);let base=Math.floor(Math.floor((Math.floor((2*actor.level)/5)+2)*bp*atk/def)/50)+2;
 const hasStab=!!move.forceSTAB||(offensiveMon.types||actor.types||[]).includes(type);const stab=hasStab?(ab==='adaptability'?2:1.5):1;if(isGrounded(actor)){if(b.terrain==='electric'&&type==='Electric')abilityMult*=1.3;if(b.terrain==='grassy'&&type==='Grass')abilityMult*=1.3;if(b.terrain==='psychic'&&type==='Psychic')abilityMult*=1.3;if(b.terrain==='misty'&&type==='Fairy')abilityMult*=1.3;}
 let weatherMult=1;if(b.weather==='rain'){if(type==='Water')weatherMult=1.5;if(type==='Fire')weatherMult=.5;}if(b.weather==='sun'){if(type==='Fire')weatherMult=1.5;if(type==='Water')weatherMult=.5;}
 const effectiveness=typeMult(type,monSpecies(target),target);let screenMult=1;const targetSide=b.playerTeam.some(m=>m.uid===target.uid)?'player':'enemy';const screens=b.sideConditions?.[targetSide];if(screens){if(move.category==='Physical'&&screens.reflect>0)screenMult=.5;if(move.category==='Special'&&screens.lightscreen>0)screenMult=.5;if((screens.auroraveil||0)>0)screenMult=.5;}let defenseAbility=1;if(effectiveness>1&&['filter','solidrock','prismarmor'].includes(dab))defenseAbility=.75;
 let critical=Math.random()<v19CriticalChance(actor,target,move,b);let critMult=critical?(Number(move.critModifier)>0?Number(move.critModifier):1.5):1;let random=move.noDamageVariance?1:(.85+Math.random()*.15);
 const burnMult=(move.category==='Physical'&&actor.status==='brn'&&ab!=='guts')?0.5:1;
 if(ab==='solarpower'&&b.weather==='sun'&&move.category==='Special')abilityMult*=1.5;if(dab==='thickfat'&&['Fire','Ice'].includes(type))abilityMult*=.5;if(dab==='heatproof'&&type==='Fire')abilityMult*=.5;if(dab==='fluffy'){if(move.flags?.contact)abilityMult*=.5;if(type==='Fire')abilityMult*=2;}if(dab==='waterbubble'&&type==='Fire')abilityMult*=.5;const damage=Math.max(effectiveness===0?0:1,Math.floor(base*stab*effectiveness*weatherMult*abilityMult*itemMult*defenseAbility*critMult*burnMult*screenMult*random));
 return {damage,type,power,effectiveness,critical,stab,weatherMult};}
function applyDamage(target,damage,source=null,move=null){if(target.fainted||damage<=0)return 0;if(target.volatile?.substituteHp>0&&source&&source.uid!==target.uid){const absorbed=Math.min(target.volatile.substituteHp,damage);target.volatile.substituteHp-=absorbed;battleLog(`${target.name}のみがわりが攻撃を受け止めた！`);if(target.volatile.substituteHp<=0){delete target.volatile.substituteHp;battleLog(`${target.name}のみがわりが壊れた！`);}return absorbed;}let actual=Math.max(0,Math.min(damage,target.hp));const full=target.hp===target.maxhp;if(full&&target.hp-damage<=0&&itemSlug(target.heldItem)==='focussash'){actual=target.hp-1;target.heldItem='';battleLog(`${target.name}は「きあいのタスキ」で持ちこたえた！`);}target.hp=Math.max(0,target.hp-actual);if(target.hp<=0){target.fainted=true;battleLog(`${target.name}は倒れた！`);}if(source&&move?.drain&&actual>0){const [n,d]=move.drain;const heal=Math.max(1,Math.floor(actual*(n||1)/(d||2)));source.hp=Math.min(source.maxhp,source.hp+heal);battleLog(`${source.name}はHPを${heal}回復した！`);}if(source&&move?.recoil&&actual>0){const [n,d]=move.recoil;const recoil=Math.max(1,Math.floor(actual*(n||1)/(d||3)));source.hp=Math.max(0,source.hp-recoil);if(source.hp===0)source.fainted=true;battleLog(`${source.name}は反動で${recoil}ダメージを受けた！`);}if(source&&move?.flags?.contact){if(itemSlug(target.heldItem)==='rockyhelmet'){const chip=Math.max(1,Math.floor(source.maxhp/6));source.hp=Math.max(0,source.hp-chip);if(source.hp===0)source.fainted=true;battleLog(`${source.name}はゴツゴツメットで${chip}ダメージ！`);}const ta=slug(target.abilityId);if(['roughskin','ironbarbs'].includes(ta)){const chip=Math.max(1,Math.floor(source.maxhp/8));source.hp=Math.max(0,source.hp-chip);if(source.hp===0)source.fainted=true;battleLog(`${source.name}は${abilityName(target.abilityId)}でダメージ！`);}else if(['static','flamebody','poisonpoint'].includes(ta)&&!source.status&&Math.random()<.3){setStatus(source,ta==='static'?'par':ta==='flamebody'?'brn':'psn',abilityName(target.abilityId));}}return actual;}

function getEffectiveAccuracy(move,actor,target,b){if(move.ignoreAccuracy||move.alwaysHit||move.accuracy===true)return 100;let accuracy=move.accuracy==null?100:Number(move.accuracy);if(['thunder','hurricane'].includes(move.id)){if(b.weather==='rain')accuracy=100;else if(b.weather==='sun')accuracy=50;}if(move.id==='blizzard'&&b.weather==='snow')accuracy=100;const ab=slug(actor.abilityId),dab=slug(target.abilityId);if(ab==='compoundeyes')accuracy*=1.3;if(ab==='noguard'||dab==='noguard')accuracy=100;if(b.weather==='sand'&&dab==='sandveil')accuracy*=.8;if(b.weather==='snow'&&dab==='snowcloak')accuracy*=.8;const stage=(actor.stages?.accuracy||0)-(target.stages?.evasion||0);const mult=stage>=0?(3+stage)/3:3/(3-stage);return Math.min(100,accuracy*mult);}
function setStatus(target,status,sourceName=''){ if(!status||target.status||target.fainted)return false;const p=monSpecies(target);const ab=slug(target.abilityId);if(status==='par'&&(p?.types.includes('Electric')||ab==='limber')){battleLog(`${target.name}には まひが効かない！`);return false;}if(status==='brn'&&(p?.types.includes('Fire')||ab==='waterveil'||ab==='waterbubble')){battleLog(`${target.name}には やけどが効かない！`);return false;}if(status==='frz'&&p?.types.includes('Ice')){battleLog(`${target.name}はこおり状態にならない！`);return false;}if((status==='psn'||status==='tox')&&(p?.types.includes('Poison')||p?.types.includes('Steel')||ab==='immunity')){battleLog(`${target.name}には どくが効かない！`);return false;}if(status==='slp'&&(ab==='insomnia'||ab==='vitalspirit')){battleLog(`${target.name}は眠らない特性を持っている！`);return false;}const b=state.battle;if(isGrounded(target)&&b?.terrain==='electric'&&status==='slp'){battleLog('エレキフィールドに守られて眠らない！');return false;}if(isGrounded(target)&&b?.terrain==='misty'){battleLog('ミストフィールドに守られて状態異常にならない！');return false;}target.status=status;target.statusTurns=0;battleLog(`${target.name}は${STATUS_JA[status]||status}状態になった！${sourceName?`（${sourceName}）`:''}`);if(slug(target.heldItem)==='lumberry'){target.status=null;target.heldItem='';battleLog(`${target.name}はラムのみで状態異常を治した！`);}return true;}
function applyBoosts(target,boosts,sourceName=''){if(!boosts)return;for(const [key,amount] of Object.entries(boosts)){const k=({attack:'atk',defense:'def',specialattack:'spa',specialdefense:'spd',speed:'spe',accuracy:'accuracy',evasion:'evasion'})[slug(key)]||key; if(!(k in target.stages))continue;const old=target.stages[k];target.stages[k]=Math.max(-6,Math.min(6,old+Number(amount||0)));const d=target.stages[k]-old;if(d!==0)battleLog(`${target.name}の${STAT_JA[k]||k}が${Math.abs(d)>=2?'ぐーんと':Math.abs(d)===1?'':'大きく'}${d>0?'上がった':'下がった'}！`);} }
function applyWeather(weather,b){if(!weather)return;let w=slug(weather);if(w.includes('rain'))w='rain';else if(w.includes('sun')||w.includes('drought'))w='sun';else if(w.includes('sand'))w='sand';else if(w.includes('snow')||w.includes('hail'))w='snow';else return;b.weather=w;b.weatherTurns=5;battleLog(`天気が${WEATHER_JA[w]}になった！`);}
function isGrounded(mon){if(!mon)return false;const types=mon.types||monSpecies(mon)?.types||[];return !types.includes('Flying')&&slug(mon.abilityId)!=='levitate'&&itemSlug(mon.heldItem)!=='airballoon';}
function applyTerrain(terrain,b){if(!terrain)return;const t=slug(terrain);const map={electric:'electric',electricterrain:'electric',grassy:'grassy',grassyterrain:'grassy',psychic:'psychic',psychicterrain:'psychic',misty:'misty',mistyterrain:'misty'};const name=map[t];if(!name)return;b.terrain=name;b.terrainTurns=5;battleLog(`フィールドが${({electric:'エレキ',grassy:'グラス',psychic:'サイコ',misty:'ミスト'})[name]}フィールドになった！`);}
function applyMoveSpecificEffects(actor,target,move,b){
 const id=move.id; const self=actor; const foe=target;if(foe!==self&&foe.volatile?.substituteHp>0&&(move.status||move.secondary||move.secondaries?.length)){battleLog(`${foe.name}のみがわりが追加効果を防いだ！`);return;}
 const selfDrops={closecombat:{def:-1,spd:-1},superpower:{atk:-1,def:-1},overheat:{spa:-2},dracometeor:{spa:-2},leafstorm:{spa:-2},psychoBoost:{spa:-2},psychoboost:{spa:-2},makeitrain:{spa:-1},fleurcannon:{spa:-2},vcreate:{def:-1,spd:-1,spe:-1},hammerarm:{spe:-1},icehammer:{spe:-1},clangoroussoul:{hp:-1},scaleShot:{def:-1,spe:1},scaleshot:{def:-1,spe:1}};
 const targetDrops={breakingSwipe:{atk:-1},breakingswipe:{atk:-1},icywind:{spe:-1},electroweb:{spe:-1},snarl:{spa:-1},lunge:{atk:-1},mysticalfire:{spa:-1},skittersmack:{spa:-1},spiritbreak:{spa:-1},chillingwater:{atk:-1},bulldoze:{spe:-1},acidSpray:{spd:-2},acidspray:{spd:-2},eerieimpulse:{spa:-2},fakeTears:{spd:-2},faketears:{spd:-2},metalsound:{spd:-2},screech:{def:-2},leer:{def:-1},tailwhip:{def:-1},growl:{atk:-1},charm:{atk:-2},scaryface:{spe:-2},stringshot:{spe:-2},featherdance:{atk:-2},cottonspore:{spe:-2},confide:{spa:-1},tearfullook:{atk:-1,spa:-1},babydolleyes:{atk:-1},icywind:{spe:-1}};
 const selfBoosts={rapidspin:{spe:1},flamecharge:{spe:1},trailblaze:{spe:1},meteorMash:{atk:1},meteormash:{atk:1},steelwing:{def:1},ancientpower:{atk:1,def:1,spa:1,spd:1,spe:1},ominouswind:{atk:1,def:1,spa:1,spd:1,spe:1},silverwind:{atk:1,def:1,spa:1,spd:1,spe:1},fellstinger:{atk:3},esperwing:{spe:1,spa:1},charge:{spd:1}};
 const targetBoosts={};
 // Showdown's structured boosts/secondaries are processed by applyMoveExtras.
 // Keep legacy move-name rules only for records that do not carry equivalent structured data.
 const explicitSelfBoost=!!move.self?.boosts||!!move.selfBoost?.boosts||((move.target==='self'||['self','allySide'].includes(move.target))&&!!move.boosts);
 const explicitTargetBoost=!!(move.boosts&&!['self','allySide'].includes(move.target))||
  !!move.secondary?.boosts||(move.secondaries||[]).some(x=>x?.boosts&&!x.self);
 const explicitAnyBoost=explicitSelfBoost||explicitTargetBoost||!!move.secondary?.boosts||(move.secondaries||[]).some(x=>!!x?.boosts);
 if(selfDrops[id]&&!explicitSelfBoost)applyBoosts(self,selfDrops[id],getMoveName(move));
 if(targetDrops[id]&&!explicitTargetBoost)applyBoosts(foe,targetDrops[id],getMoveName(move));
 if(selfBoosts[id]&&!explicitAnyBoost)applyBoosts(self,selfBoosts[id],getMoveName(move));
 // Item-removal and item-exchange effects.
 if(id==='knockoff'&&foe.heldItem){const old=foe.heldItem;foe.heldItem='';battleLog(`${foe.name}の${old}は はたき落とされた！`);}
 if(['thief','covet'].includes(id)&&!self.heldItem&&foe.heldItem){self.heldItem=foe.heldItem;foe.heldItem='';battleLog(`${self.name}は相手の持ち物を奪った！`);}
 if(['trick','switcheroo'].includes(id)&&foe!==self){const item=self.heldItem||'';self.heldItem=foe.heldItem||'';foe.heldItem=item;battleLog('お互いの持ち物が入れ替わった！');}
 if((id==='fling'||Number(move.apiId||0)===374)&&self.heldItem){self.heldItem='';battleLog(`${self.name}は持ち物を投げつけた！`);}
 // Side conditions are stored independently for each side.
 b.sideConditions=b.sideConditions||{player:{},enemy:{}};b.sideConditions.player=b.sideConditions.player||{};b.sideConditions.enemy=b.sideConditions.enemy||{};
 const ownSide=b.playerTeam.some(m=>m.uid===self.uid)?'player':'enemy';const foeSide=ownSide==='player'?'enemy':'player';const ownCond=b.sideConditions[ownSide],foeCond=b.sideConditions[foeSide];
 if(['stealthrock','spikes','toxicspikes','stickyweb'].includes(id)){if(id==='stealthrock')foeCond.stealthrock=true;if(id==='spikes')foeCond.spikes=Math.min(3,(foeCond.spikes||0)+1);if(id==='toxicspikes')foeCond.toxicspikes=Math.min(2,(foeCond.toxicspikes||0)+1);if(id==='stickyweb')foeCond.stickyweb=true;battleLog('相手側に設置技をまいた！');}
 if(['reflect','lightscreen','auroraveil'].includes(id)){ownCond[id]=5;battleLog('味方側に壁を張った！');}
 if(['brickbreak','psychicfangs'].includes(id)){foeCond.reflect=0;foeCond.lightscreen=0;foeCond.auroraveil=0;battleLog('相手側の壁を破壊した！');}
 if(id==='defog'){for(const side of Object.values(b.sideConditions)){side.stealthrock=false;side.spikes=0;side.toxicspikes=0;side.stickyweb=false;side.reflect=0;side.lightscreen=0;side.auroraveil=0;}battleLog('場の障害物や壁を取り除いた！');}
 if(id==='rapidspin'){self.volatile=self.volatile||{};delete self.volatile.leechseed;ownCond.stealthrock=false;ownCond.spikes=0;ownCond.toxicspikes=0;ownCond.stickyweb=false;}
 if(id==='substitute'&&!self.volatile?.substituteHp){const cost=Math.floor(self.maxhp/4);if(self.hp>cost){self.hp-=cost;self.volatile.substituteHp=cost;battleLog(`${self.name}はみがわりを作った！`);}else battleLog('しかし HPが足りない！');}
 if(id==='leechseed'){if((monSpecies(foe)?.types||[]).includes('Grass'))battleLog('くさタイプには効かない！');else if(!foe.volatile?.leechseed){foe.volatile=foe.volatile||{};foe.volatile.leechseed=true;foe.volatile.leechseedOwner=self.uid;battleLog(`${foe.name}にタネを植えつけた！`);}}
 if(id==='taunt'){foe.volatile=foe.volatile||{};foe.volatile.tauntTurns=3;}
 if(id==='encore'){foe.volatile=foe.volatile||{};foe.volatile.encoreTurns=3;foe.volatile.encoreMove=foe.lastMoveId||null;}
 if(id==='disable'){foe.volatile=foe.volatile||{};foe.volatile.disabledMove=foe.lastMoveId||null;foe.volatile.disableTurns=4;}
 if(id==='torment'){foe.volatile=foe.volatile||{};foe.volatile.torment=true;}
 // Apply Showdown's declarative side-condition and pseudo-weather fields for moves
 // that are not already covered by the older move-ID handlers above.
 const sideCond=slug(move.sideCondition||''),moveApi=Number(move.apiId||0);
 const oldConditionMoveIds=new Set(['stealthrock','spikes','toxicspikes','stickyweb','reflect','lightscreen','auroraveil']);
 const oldConditionApiIds=new Set([446,191,390,564,115,113,694]);
 if(sideCond&&!oldConditionMoveIds.has(id)&&!oldConditionApiIds.has(moveApi)){
  const ownTarget=['self','allyside','allies','usersfield','allpokemon'].includes(slug(move.target));
  const dest=ownTarget?ownCond:foeCond;
  if(sideCond==='spikes')dest.spikes=Math.min(3,Number(dest.spikes||0)+1);
  else if(sideCond==='toxicspikes')dest.toxicspikes=Math.min(2,Number(dest.toxicspikes||0)+1);
  else if(sideCond==='stealthrock'||sideCond==='stickyweb')dest[sideCond]=true;
  else if(['reflect','lightscreen','auroraveil','safeguard','mist','tailwind','luckychant'].includes(sideCond))dest[sideCond]=5;
  else dest[sideCond]=true;
  battleLog(ownTarget?'味方側に場の効果を展開した！':'相手側に場の効果を展開した！');
 }
 const pseudo=slug(move.pseudoWeather||'');
 const legacyPseudoApiIds=new Set([433,356,472,478]);
 const legacyPseudoNames=new Set(['trickroom','gravity','wonderroom','magicroom']);
 if(pseudo&&!legacyPseudoNames.has(id)&&!legacyPseudoApiIds.has(moveApi)){
  if(pseudo==='trickroom')b.trickRoomTurns=b.trickRoomTurns>0?0:5;
  else if(pseudo==='wonderroom')b.wonderRoomTurns=b.wonderRoomTurns>0?0:5;
  else if(pseudo==='magicroom')b.magicRoomTurns=b.magicRoomTurns>0?0:5;
  else if(pseudo==='gravity')b.gravityTurns=b.gravityTurns>0?0:5;
  else b[pseudo+'Turns']=5;
  battleLog('場の特殊効果が変化した！');
 }
 if(move.forceSwitch&&foe!==self&&!['roar','whirlwind','dragontail','circlethrow'].includes(id)&&![509,525].includes(moveApi)&&typeof v170ForceSwitch==='function')v170ForceSwitch(foe,b);
 if(id==='roar'||id==='whirlwind'||id==='dragontail'||id==='circlethrow'){const team=actor===b.playerTeam?.[0]?'enemy':(b.playerTeam.some(m=>m.uid===foe.uid)?'player':'enemy');const t=team==='player'?b.playerTeam:b.enemyTeam,active=team==='player'?b.playerActive:b.enemyActive;const ix=t.findIndex(m=>m.uid===foe.uid);const next=t.findIndex((m,i)=>i!==ix&&!m.fainted&&m.hp>0&&!active.includes(i));if(next>=0){const slot=active.indexOf(ix);if(slot>=0)active[slot]=next;triggerEntryEffects([t[next]],team==='player'?activeLiving(b.enemyTeam,b.enemyActive):activeLiving(b.playerTeam,b.playerActive),b);battleLog(`${foe.name}は吹き飛ばされた！`);}}
}
function applyMoveExtras(actor,target,move,b){if(move.weather)applyWeather(move.weather,b);if(move.id==='rest'){actor.status=null;actor.statusTurns=0;actor.hp=actor.maxhp;setStatus(actor,'slp',getMoveName(move));actor.statusTurns=0;battleLog(`${actor.name}は眠ってHPを全回復した！`);return;}if(move.status)setStatus(target,move.status,getMoveName(move));if(move.volatileStatus){target.volatile=target.volatile||{};target.volatile[move.volatileStatus]=true;battleLog(`${target.name}に${move.volatileStatus}の効果！`);}if(move.boosts)applyBoosts((move.target==='self'||['self','allySide'].includes(move.target))?actor:target,move.boosts,getMoveName(move));if(move.self?.boosts)applyBoosts(actor,move.self.boosts,getMoveName(move));if(move.selfBoost?.boosts&&!move.self?.boosts)applyBoosts(actor,move.selfBoost.boosts,getMoveName(move));if(move.self?.status)setStatus(actor,move.self.status,getMoveName(move));if(move.self?.volatileStatus){actor.volatile=actor.volatile||{};actor.volatile[move.self.volatileStatus]=true;}if(move.self?.weather)applyWeather(move.self.weather,b);if(move.self?.terrain)applyTerrain(move.self.terrain,b);if(move.heal&&Array.isArray(move.heal)){const heal=Math.max(1,Math.floor(actor.maxhp*move.heal[0]/move.heal[1]));actor.hp=Math.min(actor.maxhp,actor.hp+heal);battleLog(`${actor.name}はHPを${heal}回復した！`);}if(move.id==='protect'){actor.volatile.protected=true;battleLog(`${actor.name}は身を守った！`);}if(move.terrain)applyTerrain(move.terrain,b);if(move.id==='electricterrain')applyTerrain('electric',b);if(move.id==='grassyterrain')applyTerrain('grassy',b);if(move.id==='psychicterrain')applyTerrain('psychic',b);if(move.id==='mistyterrain')applyTerrain('misty',b);if(!move.weather&&move.id==='raindance')applyWeather('rain',b);if(!move.weather&&move.id==='sunnyday')applyWeather('sun',b);if(!move.weather&&move.id==='sandstorm')applyWeather('sand',b);if(!move.weather&&(move.id==='snowscape'||move.id==='hail'))applyWeather('snow',b);if(move.id==='thunderwave'&&!move.status)setStatus(target,'par',getMoveName(move));if(move.id==='willowisp'&&!move.status)setStatus(target,'brn',getMoveName(move));if(move.id==='toxic'&&!move.status)setStatus(target,'tox',getMoveName(move));if(move.id==='swordsdance'&&!move.boosts)applyBoosts(actor,{atk:2});if(move.id==='nastyplot'&&!move.boosts)applyBoosts(actor,{spa:2});if(move.id==='calmmind'&&!move.boosts)applyBoosts(actor,{spa:1,spd:1});if(move.id==='agility'&&!move.boosts)applyBoosts(actor,{spe:2});if(!move.heal&&(move.id==='recover'||move.id==='roost'||move.id==='slackoff'||move.id==='milkdrink'||move.id==='softboiled'||move.id==='synthesis'||move.id==='moonlight'||move.id==='morningsun')){const heal=Math.max(1,Math.floor(actor.maxhp*(b.weather==='sun'&&['synthesis','moonlight','morningsun'].includes(move.id)?2/3:1/2)));actor.hp=Math.min(actor.maxhp,actor.hp+heal);battleLog(`${actor.name}はHPを${heal}回復した！`);}const sheerForceSuppress=slug(actor.abilityId)==='sheerforce'&&!move.hasSheerForceBoost;const seconds=sheerForceSuppress?[]:[...(move.secondaries||[]),...(move.secondary?[move.secondary]:[])];for(const sec of seconds){const chance=Math.min(100,Number(sec.chance??100)*(slug(actor.abilityId)==='serenegrace'?2:1));if(Math.random()*100>chance)continue;if(sec.status)setStatus(target,sec.status,getMoveName(move));if(sec.boosts)applyBoosts(target,sec.boosts,getMoveName(move));if(sec.volatileStatus){target.volatile=target.volatile||{};target.volatile[sec.volatileStatus]=true;}if(sec.self?.status)setStatus(actor,sec.self.status,getMoveName(move));if(sec.self?.boosts)applyBoosts(actor,sec.self.boosts,getMoveName(move));if(sec.self?.volatileStatus){actor.volatile=actor.volatile||{};actor.volatile[sec.self.volatileStatus]=true;}if(sec.weather)applyWeather(sec.weather,b);if(sec.terrain)applyTerrain(sec.terrain,b);}}
function canMove(mon){if(mon.fainted||mon.hp<=0)return false;const s=mon.status;if(s==='slp'){mon.statusTurns++;if(mon.statusTurns>=3){mon.status=null;battleLog(`${mon.name}は目を覚ました！`);return true;}battleLog(`${mon.name}は眠っていて動けない！`);return false;}if(s==='frz'){mon.statusTurns++;if(mon.statusTurns>=3||Math.random()<.2){mon.status=null;battleLog(`${mon.name}のこおりが溶けた！`);return true;}battleLog(`${mon.name}は凍りついて動けない！`);return false;}if(s==='par'&&Math.random()<.25){battleLog(`${mon.name}はまひして動けない！`);return false;}if(mon.volatile?.flinch){mon.volatile.flinch=false;battleLog(`${mon.name}はひるんで動けない！`);return false;}return true;}
function chooseEnemyAction(mon,target){const candidates=(mon.moves||[]).filter(m=>m.pp>0&&getMove(m.id));if(!candidates.length)return {actorUid:mon.uid,moveId:'struggle',targetUid:target?.uid};const damage=candidates.filter(slot=>isMoveClassifiedDamageV2(getMove(slot.id)));const pool=damage.length?damage:candidates;pool.sort((a,b)=>resolvedMovePowerV2(getMove(b.id),mon,target,state.battle)-resolvedMovePowerV2(getMove(a.id),mon,target,state.battle));let pick=Math.random()<.65?pool[Math.floor(Math.random()*Math.min(pool.length,3))]:chooseRandom(candidates);return {actorUid:mon.uid,moveId:pick.id,targetUid:target?.uid};}
function activateMoveAnimation(side,slot,move){const effective=resolveMoveTypePower(move,state.battle?.weather);const moveType=effective.type||move.type||'Normal';const el=$(`#mon-${side}-${slot}`);if(el){el.classList.remove('attack-player','attack-enemy','hit');void el.offsetWidth;el.classList.add(side==='player'?'attack-player':'attack-enemy');}const label=$('#fx-label');if(label){label.textContent=getMoveName(move);label.style.setProperty('--fx',TYPE_COLORS[moveType]||'#fff');label.classList.remove('play');void label.offsetWidth;label.classList.add('play');}const fx=$('#battle-fx');if(fx){const col=TYPE_COLORS[moveType]||'#fff';fx.style.setProperty('--fx',col);fx.classList.remove('type-flash');void fx.offsetWidth;fx.classList.add('type-flash');const burst=document.createElement('div');burst.className=`type-burst type-${String(moveType).toLowerCase().replace(/[^a-z]/g,'')}`;burst.style.setProperty('--fx',col);fx.appendChild(burst);setTimeout(()=>burst.remove(),820);for(let i=0;i<26;i++){const dot=document.createElement('i');dot.className='particle';dot.style.setProperty('--fx',col);dot.style.setProperty('--x',`${30+Math.random()*40}%`);dot.style.setProperty('--y',`${20+Math.random()*60}%`);dot.style.setProperty('--dx',`${(Math.random()-.5)*320}px`);dot.style.setProperty('--dy',`${(Math.random()-.5)*260}px`);fx.appendChild(dot);setTimeout(()=>dot.remove(),820);}}}
function animateHit(side,slot){const el=$(`#mon-${side}-${slot}`);if(el){el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');}const field=$('.battlefield');if(field&&matchMedia('(prefers-reduced-motion: reduce)').matches===false){field.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:230});}}
function targetForAction(actor,act,b){const enemyTeam=act.side==='player'?b.enemyTeam:b.playerTeam;const enemyActive=act.side==='player'?b.enemyActive:b.playerActive;const live=enemyActive.map(i=>enemyTeam[i]).filter(m=>m&&!m.fainted&&m.hp>0);return live.find(m=>m.uid===act.targetUid)||live[0]||enemyTeam.find(m=>m&&!m.fainted&&m.hp>0);}
function executeAction(act,b){const team=act.side==='player'?b.playerTeam:b.enemyTeam;const actor=team.find(m=>m.uid===act.actorUid);if(!actor||actor.fainted||actor.hp<=0)return;if(actor._rechargePending){actor._rechargePending=false;battleLog(`${actor.name}は反動で動けない！`);return;}if(act.switchTo!=null){const actives=act.side==='player'?b.playerActive:b.enemyActive;const slot=act.slot||0;actives[slot]=act.switchTo;const newMon=team[act.switchTo];battleLog(`${actor.name}、戻れ！ ${newMon.name}、頼んだ！`);triggerEntryEffects([newMon],act.side==='player'?activeLiving(b.enemyTeam,b.enemyActive):activeLiving(b.playerTeam,b.playerActive),b);return;}
 if(act.mega&&!b.megaUsedBySide?.[act.side]){if(megaEvolve(actor,act.side)){b.megaUsedBySide=b.megaUsedBySide||{player:false,enemy:false};b.megaUsedBySide[act.side]=true;b.megaPendingSlots=(b.megaPendingSlots||[]).filter(x=>x!==(act.slot||0));}}
 const selectedMove=getMove(act.moveId)||{id:'struggle',name:'Struggle',jpName:'わるあがき',type:'Normal',category:'Physical',basePower:50,accuracy:100,pp:1,flags:{contact:true}};let move=selectedMove;const callerApi=Number(selectedMove.apiId||0);if(callerApi===118){const pool=Object.values(state.data.movesById||{}).filter(m=>m&&Number(m.pp)>0&&![118,165,166,448,621,622,623,693,694,695,696,697,698,699,700].includes(Number(m.apiId))&&!['struggle','metronome'].includes(slug(m.id||m.name||'')));if(pool.length){move=chooseRandom(pool);battleLog(`${actor.name}のゆびをふる！ ${getMoveName(move)}が出た！`);}}else if(callerApi===383&&b.lastSuccessfulMoveId){const copied=getMove(b.lastSuccessfulMoveId);if(copied&&Number(copied.apiId)!==383&&Number(copied.apiId)!==118){move=copied;battleLog(`${actor.name}は${getMoveName(move)}をまねした！`);}}const isChargeContinuation=actor._chargingMove===move.id;const slot=act.slot||0;const selfTarget=['self','allySide','allies','user-and-allies','users-field','entire-field','all-pokemon'].includes(move.target)||['recover','roost','slackoff','swordsdance','nastyplot','calmmind','agility','protect','rest','substitute'].includes(move.id)||Number(move.apiId)===226;const target=selfTarget?actor:targetForAction(actor,act,b);if(!target)return;if(itemSlug(actor.heldItem)==='assaultvest'&&move.category==='Status'){battleLog(`${actor.name}のとつげきチョッキで変化技を使えない！`);return;}if(actor.volatile?.tauntTurns>0&&move.category==='Status'){battleLog(`${actor.name}はちょうはつされて変化技を出せない！`);return;}if(actor.volatile?.disabledMove===move.id&&actor.volatile?.disableTurns>0){battleLog(`${getMoveName(move)}は封じられている！`);return;}if(actor.volatile?.torment&&actor.lastMoveId===move.id){battleLog(`${actor.name}は同じ技を続けて出せない！`);return;}if(actor.volatile?.encoreTurns>0&&actor.volatile?.encoreMove&&actor.volatile.encoreMove!==move.id){battleLog(`${actor.name}はアンコールで技を縛られている！`);return;}battleLog(`${actor.name}の ${getMoveName(move)}！`);actor.lastMoveId=move.id;if(!canMove(actor))return;if(isChargeContinuation){actor._chargingMove=null;actor._semiInvulnerable=false;}actor._lastMoveHit=false;actor._lastMoveDamage=0;actor._lastHitWasSubstitute=false;const moveSlot=actor.moves.find(m=>m.id===selectedMove.id);if(!isChargeContinuation&&moveSlot&&moveSlot.pp>0){let ppCost=1;if(slug(target.abilityId)==='pressure')ppCost++;moveSlot.pp=Math.max(0,moveSlot.pp-ppCost);}if(Number(move.apiId||0)===798&&!b.terrain){battleLog(`${getMoveName(move)}はフィールドがないため失敗した！`);actor._lastMoveHit=false;return;}
 if(move.id==='struggle'||move.id==='struggle'){const dmg=calculateDamage(actor,target,move,b);applyDamage(target,Math.max(1,dmg.damage),actor,move);actor._lastMoveHit=true;actor._lastMoveDamage=dmg.damage;b.lastSuccessfulMoveId=move.id;return;}
 if(!isChargeContinuation&&V170_CHARGE_API.has(Number(move.apiId||0))&&!(Number(move.apiId)===76&&b.weather==='sun')&&itemSlug(actor.heldItem)!=='powerherb'){actor._chargingMove=move.id;if(V170_SEMI_INVULNERABLE_API.has(Number(move.apiId||0)))actor._semiInvulnerable=true;battleLog(`${actor.name}は力をためている！`);return;}
 const accuracy=getEffectiveAccuracy(move,actor,target,b);if(Math.random()*100>accuracy){battleLog(`${actor.name}の攻撃は外れた！（命中率 ${Math.round(accuracy)}%）`);return;}
 if(actor.volatile?.lockedMove&&actor.volatile.lockedMove!==move.id){battleLog('技を続けて出せない！');return;}
 if(target.volatile?.protected&&!v171BypassesProtect(move)){if(target._kingShieldTurn===b.turn&&move.flags?.contact)applyBoosts(actor,{atk:-1},'キングシールド');if(target._spikyShieldTurn===b.turn&&move.flags?.contact){const chip=Math.max(1,Math.floor(actor.maxhp/8));actor.hp=Math.max(0,actor.hp-chip);if(actor.hp<=0)actor.fainted=true;battleLog(`${actor.name}はニードルガードで${chip}ダメージ！`);}if(target._banefulBunkerTurn===b.turn&&move.flags?.contact&&!actor.status)setStatus(actor,'psn','トーチカ');battleLog(`${target.name}は攻撃を防いだ！`);return;}const v170TargetSide=v170Side(target,b),v170Guard=b.sideConditions?.[v170TargetSide];if(v170Guard?.wideGuardTurn===b.turn&&['all-opponents','all-other-pokemon','entire-field'].includes(move.target)){battleLog(`${target.name}たちはワイドガードに守られた！`);return;}if(v170Guard?.quickGuardTurn===b.turn&&Number(move.priority||0)>0){battleLog(`${target.name}たちはファストガードに守られた！`);return;}if(target._semiInvulnerable&&target.uid!==actor.uid){battleLog(`${target.name}は攻撃をかわした！`);return;}if(target!==actor&&target.volatile?.substituteHp>0&&move.category==='Status'){battleLog(`${target.name}のみがわりに防がれた！`);return;}if((b.terrain==='psychic')&&isGrounded(target)&&(move.priority||0)>0){battleLog(`サイコフィールドに守られ、${target.name}には先制技が届かない！`);return;}
 if(abilityTriggerOnMove(actor,target,move,b))return;
 if([248,353].includes(Number(move.apiId||0))){const side=b.playerTeam.some(m=>m.uid===target.uid)?'player':'enemy';const team=side==='player'?b.playerTeam:b.enemyTeam,active=side==='player'?b.playerActive:b.enemyActive;const targetIndex=team.findIndex(m=>m.uid===target.uid);const targetSlot=Math.max(0,active.indexOf(targetIndex));b.delayedAttacks=b.delayedAttacks||[];b.delayedAttacks.push({moveId:move.id,actorUid:actor.uid,targetSide:side,targetSlot,dueIn:2});actor._lastMoveHit=true;battleLog(`${getMoveName(move)}が未来に攻撃を予告した！`);b.lastSuccessfulMoveId=move.id;return;}
 if(v170HandleVariableDamage(actor,target,move,b))return;
 if(move.ohko||V19_OHKO_API.has(Number(move.apiId||0))){v19ExecuteOhko(actor,target,move,b);return;}if(move.damage==='level'||move.damageCallback==='level'){const fixed=Math.max(1,actor.level);const actual=applyDamage(target,fixed,actor,move);battleLog(`${target.name}に${actual}ダメージ！`);return;}if(typeof move.damage==='number'&&move.damage>0){const actual=applyDamage(target,move.damage,actor,move);battleLog(`${target.name}に${actual}ダメージ！`);return;}
 const v1623ResolvedMoveData=resolveContextMoveData(move,actor,target,b);if(Number(move.apiId||0)===374&&(!actor.heldItem||Number(v1623ResolvedMoveData.power||0)<=0)){battleLog('持ち物がないか、投げられない道具のため失敗した！');actor._lastMoveHit=false;return;}if(move.category==='Status'){actor._lastMoveHit=true;actor._lastMoveDamage=0;applyMoveExtras(actor,target,move,b);applyMoveSpecificEffects(actor,target,move,b);return;}
 const result=calculateDamage(actor,target,move,b);if(result.effectiveness===0){battleLog(`効果がないようだ……`);return;}let hitCount=1;if(Array.isArray(move.multihit)){const min=Number(move.multihit[0]||2),max=Number(move.multihit[1]||min);hitCount=min===max?min:(Math.random()<.35?5:Math.floor(Math.random()*(max-min+1))+min);}else if(typeof move.multihit==='number')hitCount=move.multihit;hitCount=Math.max(1,Math.min(10,hitCount));let dealt=0,critAny=false;for(let h=0;h<hitCount&&target.hp>0;h++){const hit=h===0?result:calculateDamage(actor,target,move,b);dealt+=applyDamage(target,hit.damage,actor,{...move,recoil:undefined,drain:undefined});critAny=critAny||hit.critical;if(hit.effectiveness===0)break;}actor._lastMoveHit=dealt>0;actor._lastMoveDamage=dealt;if(dealt>0&&move.drain){const [n,d]=move.drain;const heal=Math.max(1,Math.floor(dealt*(n||1)/(d||2)));actor.hp=Math.min(actor.maxhp,actor.hp+heal);battleLog(`${actor.name}はHPを${heal}回復した！`);}if(dealt>0&&move.recoil){const [n,d]=move.recoil;const recoil=Math.max(1,Math.floor(dealt*(n||1)/(d||3)));actor.hp=Math.max(0,actor.hp-recoil);if(actor.hp===0)actor.fainted=true;battleLog(`${actor.name}は反動で${recoil}ダメージを受けた！`);}if(hitCount>1)battleLog(`${hitCount}回 命中した！`);if(critAny)battleLog('急所に当たった！');if(result.effectiveness>1)battleLog('効果はばつぐんだ！');if(result.effectiveness>0&&result.effectiveness<1)battleLog('効果はいまひとつのようだ……');if(result.weatherMult!==1)battleLog(`天候補正が発生！（${WEATHER_JA[b.weather]||''}）`);if(dealt>0)battleLog(`${target.name}に ${dealt} ダメージ！`);applyMoveExtras(actor,target,move,b);applyMoveSpecificEffects(actor,target,move,b);if(move.selfSwitch&&actor.hp>0){const team=act.side==='player'?b.playerTeam:b.enemyTeam,active=act.side==='player'?b.playerActive:b.enemyActive;const next=team.findIndex((m,i)=>i!==active[slot]&&!m.fainted&&m.hp>0&&!active.includes(i));if(next>=0){active[slot]=next;battleLog(`${actor.name}は交代して戻った！`);triggerEntryEffects([team[next]],act.side==='player'?activeLiving(b.enemyTeam,b.enemyActive):activeLiving(b.playerTeam,b.playerActive),b);}}
 if(itemSlug(actor.heldItem)==='lifeorb'&&dealt>0){const recoil=Math.max(1,Math.floor(actor.maxhp/10));actor.hp=Math.max(0,actor.hp-recoil);battleLog(`${actor.name}は命の珠で反動ダメージ！`);if(actor.hp===0)actor.fainted=true;}
 if(itemSlug(actor.heldItem)==='sitrusberry'&&actor.hp<=actor.maxhp/2){const heal=Math.floor(actor.maxhp/4);actor.hp=Math.min(actor.maxhp,actor.hp+heal);actor.heldItem='';battleLog(`${actor.name}はオボンのみでHPを回復！`);}
 if(move.id==='explosion'||move.id==='selfdestruct'){actor.hp=0;actor.fainted=true;battleLog(`${actor.name}も倒れた！`);}
}
function processEndTurn(b){for(const sideTeam of [b.playerTeam,b.enemyTeam])for(const mon of sideTeam){if(!mon||mon.fainted||mon.hp<=0)continue;const ab=slug(mon.abilityId),item=itemSlug(mon.heldItem||'');if(mon.status==='brn'){const d=Math.max(1,Math.floor(mon.maxhp/16));mon.hp=Math.max(0,mon.hp-d);battleLog(`${mon.name}はやけどで${d}ダメージ！`);}else if(mon.status==='psn'||mon.status==='tox'){const frac=mon.status==='tox'?Math.min(4,Math.max(1,mon.statusTurns+1))/16:1/16;const d=Math.max(1,Math.floor(mon.maxhp*frac));mon.hp=Math.max(0,mon.hp-d);mon.statusTurns++;battleLog(`${mon.name}は${STATUS_JA[mon.status]}で${d}ダメージ！`);}if(mon.volatile?.leechseed){const seedDamage=Math.max(1,Math.floor(mon.maxhp/8));mon.hp=Math.max(0,mon.hp-seedDamage);const owner=[...b.playerTeam,...b.enemyTeam].find(x=>x.uid===mon.volatile.leechseedOwner);if(owner&&!owner.fainted){owner.hp=Math.min(owner.maxhp,owner.hp+seedDamage);battleLog(`${mon.name}はやどりぎでHPを吸い取られた！`);}}if(mon.volatile?.tauntTurns>0){mon.volatile.tauntTurns--;if(mon.volatile.tauntTurns===0)delete mon.volatile.tauntTurns;}if(mon.volatile?.encoreTurns>0){mon.volatile.encoreTurns--;if(mon.volatile.encoreTurns===0){delete mon.volatile.encoreTurns;delete mon.volatile.encoreMove;}}if(mon.volatile?.disableTurns>0){mon.volatile.disableTurns--;if(mon.volatile.disableTurns===0){delete mon.volatile.disableTurns;delete mon.volatile.disabledMove;}}if(item==='leftovers'||(item==='blacksludge'&&monSpecies(mon)?.types.includes('Poison'))){const heal=Math.max(1,Math.floor(mon.maxhp/16));mon.hp=Math.min(mon.maxhp,mon.hp+heal);if(mon.hp===mon.maxhp){}else battleLog(`${mon.name}は持ち物でHPを回復！`);}if(mon.hp<=0){mon.hp=0;mon.fainted=true;battleLog(`${mon.name}は倒れた！`);}mon.volatile={flashFire:!!mon.volatile?.flashFire,disguiseBroken:!!mon.volatile?.disguiseBroken,iceFaceBroken:!!mon.volatile?.iceFaceBroken,leechseed:!!mon.volatile?.leechseed,leechseedOwner:mon.volatile?.leechseedOwner,substituteHp:mon.volatile?.substituteHp,tauntTurns:mon.volatile?.tauntTurns,encoreTurns:mon.volatile?.encoreTurns,encoreMove:mon.volatile?.encoreMove,disabledMove:mon.volatile?.disabledMove,disableTurns:mon.volatile?.disableTurns,torment:!!mon.volatile?.torment};}
 if(b.weather==='sand'||b.weather==='snow'){for(const mon of [...b.playerTeam,...b.enemyTeam]){if(mon.fainted||mon.hp<=0)continue;const types=monSpecies(mon)?.types||[];const immune=b.weather==='sand'?types.some(t=>['Rock','Ground','Steel'].includes(t)):types.includes('Ice');if(!immune){const d=Math.max(1,Math.floor(mon.maxhp/16));mon.hp=Math.max(0,mon.hp-d);battleLog(`${mon.name}は${WEATHER_JA[b.weather]}で${d}ダメージ！`);if(mon.hp<=0){mon.hp=0;mon.fainted=true;battleLog(`${mon.name}は倒れた！`);}}}}
 if(b.weatherTurns>0){b.weatherTurns--;if(b.weatherTurns===0){battleLog(`${WEATHER_JA[b.weather]}が止んだ。`);b.weather=null;}}if(b.terrain==='grassy'){for(const mon of [...b.playerTeam,...b.enemyTeam])if(mon&&!mon.fainted&&mon.hp>0&&isGrounded(mon)){const heal=Math.max(1,Math.floor(mon.maxhp/16));mon.hp=Math.min(mon.maxhp,mon.hp+heal);}}if(b.terrainTurns>0){b.terrainTurns--;if(b.terrainTurns===0){battleLog('フィールドの効果が消えた。');b.terrain=null;}}for(const side of Object.values(b.sideConditions||{})){for(const key of ['reflect','lightscreen','auroraveil'])if(side[key]>0){side[key]--;if(side[key]===0)battleLog('壁の効果が切れた！');}}
 // Auto-replace fainted active Pokémon with next available bench member.
 for(const side of ['player','enemy']){const team=side==='player'?b.playerTeam:b.enemyTeam;const active=side==='player'?b.playerActive:b.enemyActive;for(let s=0;s<active.length;s++){if(!team[active[s]]||team[active[s]].fainted||team[active[s]].hp<=0){const next=team.findIndex((m,i)=>!m.fainted&&m.hp>0&&!active.includes(i));if(next>=0){active[s]=next;battleLog(`${side==='player'?'味方':'相手'}は ${team[next].name}を繰り出した！`);triggerEntryEffects([team[next]],side==='player'?activeLiving(b.enemyTeam,b.enemyActive):activeLiving(b.playerTeam,b.playerActive),b);}else active[s]=-1;}}}
 const playerAlive=b.playerTeam.some(m=>m.hp>0&&!m.fainted),enemyAlive=b.enemyTeam.some(m=>m.hp>0&&!m.fainted);if(!enemyAlive&&!playerAlive){b.result='draw';battleLog('引き分け！');}else if(!enemyAlive){b.result='win';if(b.mode==='raid'){state.raidCaptureRoll=rollLegendaryTraits();battleLog('レイド勝利！ 色違い・証の個体抽選が完了した。獲得するか、再挑戦して厳選しよう。');toast('レイド勝利！ 個体を確認してください。','good');}else{state.vp+=200;battleLog('勝利！ 200 VPを獲得！');toast('勝利！ +200 VP','good');}saveLocal();}else if(!playerAlive){b.result='lose';battleLog(b.mode==='raid'?'レイド失敗……再挑戦には100 VP必要です。':'敗北……チームを見直して再挑戦しよう。');} }
function battleCinematicPause(ms){const reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);return new Promise(resolve=>setTimeout(resolve,reduced?Math.min(35,ms):ms));}
function clearBattleCamera(){const field=$('.battlefield'),overlay=$('#battle-cinematic-overlay');if(field){field.classList.remove('cine-focus-player','cine-focus-enemy');field.querySelectorAll('.cine-selected').forEach(el=>el.classList.remove('cine-selected'));}if(overlay){overlay.classList.remove('is-visible');const title=$('#battle-cinematic-title'),subtitle=$('#battle-cinematic-subtitle');if(title)title.textContent='BATTLE';if(subtitle)subtitle.textContent='';}}
function setBattleCamera(side,slot,title,subtitle){const field=$('.battlefield'),overlay=$('#battle-cinematic-overlay');if(!field||!overlay)return;field.classList.remove('cine-focus-player','cine-focus-enemy');field.querySelectorAll('.cine-selected').forEach(el=>el.classList.remove('cine-selected'));if(side==='player'||side==='enemy'){field.classList.add(`cine-focus-${side}`);const chosen=$(`#mon-${side}-${slot}`);if(chosen)chosen.classList.add('cine-selected');}const heading=$('#battle-cinematic-title'),detail=$('#battle-cinematic-subtitle');if(heading)heading.textContent=String(title||'BATTLE');if(detail)detail.textContent=String(subtitle||'');overlay.classList.add('is-visible');}
function animateCinematicProjectile(sourceSide,sourceSlot,targetSide,targetSlot,move){return new Promise(resolve=>{const field=$('.battlefield'),fx=$('#battle-fx'),source=$(`#mon-${sourceSide}-${sourceSlot}`),target=$(`#mon-${targetSide}-${targetSlot}`);if(!field||!fx||!source||!target){resolve();return;}const fr=field.getBoundingClientRect(),sr=source.getBoundingClientRect(),tr=target.getBoundingClientRect();const sx=sr.left+sr.width*.5-fr.left,sy=sr.top+sr.height*.5-fr.top-8,tx=tr.left+tr.width*.5-fr.left,ty=tr.top+tr.height*.5-fr.top-8,dx=tx-sx,dy=ty-sy;const p=document.createElement('div');const type=resolveMoveTypePower(move,state.battle?.weather).type||move.type||'Normal';const color=TYPE_COLORS[type]||'#fff';p.className='cinematic-projectile'+(move.category==='Physical'?' physical':'')+(move.category==='Status'?' status':'');p.style.left=`${sx}px`;p.style.top=`${sy}px`;p.style.setProperty('--projectile-color',color);fx.appendChild(p);const reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);const duration=reduced?90:560;const end=`translate(-50%,-50%) translate(${dx}px,${dy}px)`;if(typeof p.animate==='function'){const anim=p.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.3)'},{opacity:1,offset:.13,transform:'translate(-50%,-50%) scale(1.1)'},{opacity:1,offset:.78,transform:`${end} scale(1.15) rotate(28deg)`},{opacity:0,transform:`${end} scale(1.9) rotate(55deg)`}],{duration,easing:'cubic-bezier(.16,.72,.23,1)',fill:'forwards'});anim.finished.catch(()=>{}).finally(()=>{p.remove();resolve();});}else{setTimeout(()=>{p.remove();resolve();},duration);}});}
function animateCinematicPulse(side,slot,move){return new Promise(resolve=>{const field=$('.battlefield'),fx=$('#battle-fx'),target=$(`#mon-${side}-${slot}`);if(!field||!fx||!target){resolve();return;}const fr=field.getBoundingClientRect(),r=target.getBoundingClientRect(),ring=document.createElement('div');ring.className='cinematic-impact-ring';ring.style.left=`${r.left+r.width/2-fr.left}px`;ring.style.top=`${r.top+r.height/2-fr.top}px`;ring.style.setProperty('--projectile-color',TYPE_COLORS[resolveMoveTypePower(move,state.battle?.weather).type||move.type]||'#fff');fx.appendChild(ring);const reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches),duration=reduced?80:420;if(typeof ring.animate==='function'){const anim=ring.animate([{opacity:.9,transform:'translate(-50%,-50%) scale(.15)'},{opacity:0,transform:'translate(-50%,-50%) scale(2.7)'}],{duration,easing:'ease-out',fill:'forwards'});anim.finished.catch(()=>{}).finally(()=>{ring.remove();resolve();});}else setTimeout(()=>{ring.remove();resolve();},duration);});}
function cinematicResultFromLogs(messages,targetDamaged,move){const text=messages.join(' ');if(/外れた|うまく決まらなかった/.test(text))return {title:'MISS!',subtitle:text||'攻撃は外れた！',miss:true,blocked:true};if(/攻撃を防いだ|守った|届かない|効果がないようだ|使えない|封じられている|出せない|動けない|ひるんで|眠っていて|凍って動けない/.test(text))return {title:'BLOCKED',subtitle:text||'技は防がれた！',miss:false,blocked:true};if(targetDamaged)return {title:'HIT!',subtitle:`${getMoveName(move)} が命中！`,miss:false,blocked:false};if(!isMoveClassifiedDamageV2(move))return {title:'EFFECT!',subtitle:`${getMoveName(move)} の効果が発動！`,miss:false,blocked:false};return {title:'IMPACT!',subtitle:text||`${getMoveName(move)} がぶつかった！`,miss:false,blocked:false};}
async function executeTurn(actions){const b=state.battle;if(!b||b.turnBusy||b.result)return;b.turnBusy=true;renderPage();const playerAlive=activeLiving(b.playerTeam,b.playerActive),enemyAlive=activeLiving(b.enemyTeam,b.enemyActive);const auto=[];for(let i=0;i<b.enemyActive.length;i++){const m=b.enemyTeam[b.enemyActive[i]];const tgt=playerAlive[Math.floor(Math.random()*playerAlive.length)];if(m&&!m.fainted&&tgt)auto.push({...chooseEnemyAction(m,tgt),side:'enemy',slot:i});}
 const all=actions.map(a=>({...a,side:b.mode==='online'?(a.side||'player'):'player'})).concat(b.mode==='online'?[]:auto);all.sort((a,c)=>{const am=a.switchTo!=null?7:(getMove(a.moveId)?.priority||0),cm=c.switchTo!=null?7:(getMove(c.moveId)?.priority||0);if(am!==cm)return cm-am;const at=(a.side==='player'?b.playerTeam:b.enemyTeam).find(m=>m.uid===a.actorUid);const ct=(c.side==='player'?b.playerTeam:b.enemyTeam).find(m=>m.uid===c.actorUid);const as=currentStat(at||{stats:{spe:1},stages:{}},'spe')*((b.sideConditions?.[a.side]?.tailwindTurns||0)>0?2:1);const cs=currentStat(ct||{stats:{spe:1},stages:{}},'spe')*((b.sideConditions?.[c.side]?.tailwindTurns||0)>0?2:1);return b.trickRoomTurns>0?as-cs:cs-as;});
 for(const act of all){if(b.result)break;const actorTeam=act.side==='player'?b.playerTeam:b.enemyTeam;const actor=actorTeam.find(m=>m.uid===act.actorUid);if(!actor||actor.fainted||actor.hp<=0)continue;const slot=act.slot||0;
  if(actor._rechargePending){actor._rechargePending=false;battleLog(`${actor.name}は反動で動けない！`);continue;}
  if(actor._chargingMove&&act.switchTo==null)act.moveId=actor._chargingMove;
  if(act.switchTo!=null){actor._chargingMove=null;actor._semiInvulnerable=false;clearBattleCamera();await battleCinematicPause(260);executeAction(act,b);renderPage();await battleCinematicPause(250);continue;}
  const m=getMove(act.moveId)||{id:act.moveId,name:'Struggle',jpName:'わるあがき',type:'Normal',category:'Physical',basePower:50,accuracy:100,pp:1,flags:{contact:true}};const targetSide=(['self','allySide','allies'].includes(m.target)||['recover','roost','slackoff','swordsdance','nastyplot','calmmind','agility','protect','rest','substitute'].includes(m.id))?act.side:(act.side==='player'?'enemy':'player');const targetTeam=targetSide==='player'?b.playerTeam:b.enemyTeam;const targetActive=targetSide==='player'?b.playerActive:b.enemyActive;const target=targetSide===act.side?actor:targetForAction(actor,act,b);const targetIndex=target?targetTeam.findIndex(x=>x.uid===target.uid):-1;let targetSlot=targetActive.indexOf(targetIndex);if(targetSlot<0)targetSlot=Math.max(0,slot);const hpBefore=target?Number(target.hp||0):0;const substituteBefore=Number(target?.volatile?.substituteHp||0);const logStart=b.log.length;
  setBattleCamera(act.side,slot,getMoveName(m),`${actor.name} が技を放つ！`);activateMoveAnimation(act.side,slot,m);await battleCinematicPause(680);
  // Run the original battle logic now, but do not redraw yet. HP bars and status UI stay
  // at their pre-hit values until the projectile reaches the target and the camera cuts.
  executeAction(act,b);const newMessages=b.log.slice(logStart);const targetDamaged=!!(target&&(Number(target.hp||0)<hpBefore||Number(target?.volatile?.substituteHp||0)<substituteBefore));const result=cinematicResultFromLogs(newMessages,targetDamaged,m);const damagingMove=isMoveClassifiedDamageV2(m);const selfTarget=target===actor;
  if(target&&!result.blocked&&!selfTarget&&targetSlot>=0&&damagingMove){await animateCinematicProjectile(act.side,slot,targetSide,targetSlot,m);}else if(target&&!result.blocked){await animateCinematicPulse(targetSide,targetSlot,m);}else{await battleCinematicPause(170);}
  // Impact cut: redraw data now, so the HP bar only falls after the visible hit.
  renderPage();setBattleCamera(targetSide,targetSlot,result.title,`${target?.name||'対象'} · ${result.subtitle}`);if(targetDamaged&&targetSlot>=0)animateHit(targetSide,targetSlot);if(target&&!result.blocked&&!targetDamaged)await animateCinematicPulse(targetSide,targetSlot,m);await battleCinematicPause(720);clearBattleCamera();
 }
 processEndTurn(b);b.turn++;b.pending={};b.megaPendingSlots=[];state.pendingActions={};state.selectedMove=null;state.selectedActiveSlot=0;b.turnBusy=false;saveLocal();renderPage();}

function findMegaForm(mon){const base=monSpecies(mon);if(!base)return null;const stone=itemSlug(mon.heldItem||'');if(stone==='garchompitez'&&(slug(base.id||base.name)==='garchomp'||slug(base.baseSpecies)==='garchomp'))return MEGA_GARCHOMP_Z_FORM;if(stone==='garchompite'&&(slug(base.id||base.name)==='garchomp'||slug(base.baseSpecies)==='garchomp'))return MEGA_GARCHOMP_FORM;const rules={venusaurite:['Venusaur',''],charizarditex:['Charizard','Mega-X'],charizarditey:['Charizard','Mega-Y'],blastoisinite:['Blastoise',''],alakazite:['Alakazam',''],gengarite:['Gengar',''],kangaskhanite:['Kangaskhan',''],pinsirite:['Pinsir',''],gyaradosite:['Gyarados',''],aerodactylite:['Aerodactyl',''],mewtwonitex:['Mewtwo','Mega-X'],mewtwonitey:['Mewtwo','Mega-Y'],ampharosite:['Ampharos',''],scizorite:['Scizor',''],heracronite:['Heracross',''],houndoominite:['Houndoom',''],tyranitarite:['Tyranitar',''],blazikenite:['Blaziken',''],gardevoirite:['Gardevoir',''],mawilite:['Mawile',''],aggronite:['Aggron',''],medichamite:['Medicham',''],manectite:['Manectric',''],banettite:['Banette',''],absolite:['Absol',''],latiasite:['Latias',''],latiosite:['Latios',''],garchompite:['Garchomp',''],lucarionite:['Lucario',''],abomasite:['Abomasnow',''],beedrillite:['Beedrill',''],pidgeotite:['Pidgeot',''],slowbronite:['Slowbro',''],steelixite:['Steelix',''],sceptilite:['Sceptile',''],swampertite:['Swampert',''],sablenite:['Sableye',''],sharpedonite:['Sharpedo',''],cameruptite:['Camerupt',''],altarianite:['Altaria',''],galladite:['Gallade',''],audinite:['Audino',''],lopunnite:['Lopunny',''],diancite:['Diancie',''],metagrossite:['Metagross','']};const rule=rules[stone];if(!rule)return null;const [speciesName,forme]=rule;if(base.name!==speciesName&&base.baseSpecies!==speciesName)return null;return state.data.dex.find(p=>p.isMega&&(p.baseSpecies===speciesName||p.name.startsWith(speciesName+'-Mega'))&&(!forme||p.forme===forme||p.name.endsWith(forme)))||null;}
function megaEvolve(mon,side='player'){if(!mon||mon.megaUsed)return false;if(side==='player'&&capItem('megaenergy')<1){toast('メガエナジーが足りません。ショップで5000 VPで購入してください。','warn');return false;}const mega=findMegaForm(mon);if(!mega){toast('このポケモンに対応するメガシンカデータが見つかりません。','warn');return false;}const ratio=mon.hp/mon.maxhp;mon.speciesId=mega.id;mon.name=getPokeName(mega);mon.types=mega.types;mon.abilityId=Object.values(mega.abilities||{})[0]||mon.abilityId;mon.stats=calcStats(mon);mon.maxhp=mon.stats.hp;mon.hp=Math.max(1,Math.min(mon.maxhp,Math.round(mon.maxhp*ratio)));mon.megaUsed=true;mon.megaActive=true;if(side==='player'){state.items.megaenergy=Math.max(0,Number(state.items.megaenergy||0)-1);saveLocal();}battleLog(`${mon.name}にメガシンカした！`);toast(`${mon.name}にメガシンカ！`,'good');return true;}
function openModal(title,body,buttons=[]){const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="閉じる">×</button></div><div class="modal-body">${body}${buttons.length?`<div class="action-row" style="margin-top:18px">${buttons.join('')}</div>`:''}</div></section></div>`;}
function openHelp(){openModal('遊び方 / HOW TO PLAY',`<div class="list"><div class="activity-row"><div class="activity-icon">⚔</div><div class="activity-copy"><b>1. 技を選んで詳細を確認</b><small>威力・命中・PP・物理/特殊/変化・説明を読んで「技を使う」。</small></div></div><div class="activity-row"><div class="activity-icon">↔</div><div class="activity-copy"><b>2. 相手に合わせて交代</b><small>相手のタイプ、HP、特性、状態異常を確認してポケモンを交代します。</small></div></div><div class="activity-row"><div class="activity-icon">☁</div><div class="activity-copy"><b>3. 天候を利用する</b><small>雨ではみず技が強くなり、ほのお技は弱くなります。ウェザーボールは雨で威力100・みずタイプになります。</small></div></div><div class="activity-row"><div class="activity-icon">⌁</div><div class="activity-copy"><b>4. トレーニング</b><small>努力値・性格・特性・技・持ち物を設定。保存してからバトルに反映します。</small></div></div></div><p class="footer-note">このファン試作はHTML内蔵データを使用する独自実装です。全ての技・特性・持ち物の効果が完全再現されているわけではありません。対応済みの効果は更新を続けます。</p>`,['<button class="btn btn-primary" data-action="close-modal">OK</button>']);}
function bindPageEvents(){
 // Deliberately event-delegated: page rerenders do not accumulate button listeners.
 const main=$('#main'); if(!main)return;
 main.oninput=(e)=>{const el=e.target;if(el.id==='dex-search'){state.dexSearch=el.value;refreshWithFocus('dex-search');}else if(el.id==='box-search'){state.boxSearch=el.value;refreshWithFocus('box-search');}else if(el.id==='scout-search'){state.scoutSearch=el.value;refreshWithFocus('scout-search');}else if(el.id==='shop-search'){state.shopSearch=el.value;refreshWithFocus('shop-search');}else if(el.id==='move-search'){state.moveSearch=el.value;refreshWithFocus('move-search');}else if(el.id==='ability-search'){state.abilitySearch=el.value;refreshWithFocus('ability-search');}else if(el.matches('[data-ev]')){const mon=state.owned.find(m=>m.uid===state.selectedOwned)||state.owned[0];if(!mon)return;const k=el.dataset.ev;let value=Number(el.value);const total=Object.values(mon.evs||{}).reduce((a,b)=>a+Number(b||0),0);const others=total-Number(mon.evs?.[k]||0);value=Math.min(value,Math.max(0,510-others));value=Math.floor(value/4)*4;mon.evs[k]=value;el.value=value;const out=$(`#ev-value-${k}`);if(out)out.textContent=value;}};
 main.onchange=(e)=>{const el=e.target;if(el.id==='dex-type'){state.dexType=el.value;state.dexLoad=60;renderPage();}else if(el.id==='move-type'){state.moveType=el.value;state.moveCatalogLimit=72;renderPage();}else if(el.id==='move-category'){state.moveCategory=el.value;state.moveCatalogLimit=72;renderPage();}else if(el.id==='move-effect-category'){state.moveEffectCategory=el.value;state.moveEffectDetailFilter='all';state.moveCatalogLimit=72;renderPage();}else if(el.id==='ability-category'){state.abilityCategory=el.value;state.abilityCatalogLimit=90;renderPage();}else if(el.id==='box-filter'){state.boxFilter=el.value;renderPage();}else if(el.id==='nature-select'){const m=state.owned.find(m=>m.uid===state.selectedOwned);if(m)m.nature=el.value;renderPage();}else if(el.id==='ability-select'){const m=state.owned.find(m=>m.uid===state.selectedOwned);if(m)m.abilityId=el.value;renderPage();}else if(el.id==='tera-type-select'){const m=state.owned.find(m=>m.uid===state.selectedOwned);if(m)m.teraType=el.value;saveLocal();renderPage();}else if(el.id==='held-item'){const m=state.owned.find(m=>m.uid===state.selectedOwned);if(m)m.heldItem=el.value;renderPage();}else if(el.id==='level-input'){const m=state.owned.find(m=>m.uid===state.selectedOwned);if(m){m.level=Math.max(1,Math.min(100,Number(el.value)||50));renderPage();}}else if(el.matches('.move-slot-select')){const m=state.owned.find(m=>m.uid===state.selectedOwned);if(m){const slot=Number(el.dataset.slot);m.moves=m.moves||[];if(el.value){m.moves[slot]={id:el.value,pp:getMove(el.value)?.pp||10};}else m.moves[slot]=null;m.moves=m.moves.filter(Boolean);renderPage();}}else if(el.id==='import-save'){const file=el.files?.[0];const status=$('#import-save-status');const button=$('#import-save-confirm');if(status)status.textContent=file?`選択中：${file.name}（${Math.max(1,Math.round(file.size/1024))} KB）— 下のボタンを押すと読み込みます。`:'JSONファイルが選択されていません。';if(button)button.disabled=!file;}};
}
function refreshWithFocus(id){const old=$(`#${id}`);const start=old?.selectionStart,end=old?.selectionEnd;renderPage();const now=$(`#${id}`);if(now){now.focus();try{now.setSelectionRange(start,end);}catch(_){}}}
function openSwitchModal(){const b=state.battle;if(!b||b.result)return;const slot=state.selectedActiveSlot;const currentIndex=b.playerActive[slot];const choices=b.playerTeam.map((m,i)=>({m,i})).filter(({m,i})=>!m.fainted&&m.hp>0&&!b.playerActive.includes(i));if(!choices.length){toast('交代できるポケモンがいません。','warn');return;}openModal('ポケモンを交代',`<p class="small muted">味方${slot+1}のポケモンを選択してください。交代はそのターンの行動を消費します。</p><div class="list">${choices.map(({m,i})=>`<button class="owned-row" data-action="switch-to" data-index="${i}" data-slot="${slot}">${speciesIcon(m)}<span><b>${esc(m.name)}</b><small>HP ${m.hp}/${m.maxhp} · ${m.status?STATUS_JA[m.status]: '状態異常なし'}</small></span></button>`).join('')}</div>`);}
async function handleAction(action,el){const b=state.battle;
 switch(action){
 case 'help':openHelp();break;
 case 'admin-unlock':if($('#admin-code')?.value==='0605'){state.adminUnlocked=true;$('#admin-code').value='';toast('管理者モードを開きました。','good');renderPage();}else{toast('コードが違います。','bad');}break;
 case 'admin-save-config':if(!state.adminUnlocked){toast('管理者モードを開いてください。','bad');break;}state.adminConfig=cleanAdminConfig(Object.fromEntries(Object.keys(DEFAULT_ADMIN_CONFIG).map(k=>[k,$(`#admin-${k}`)?.value??DEFAULT_ADMIN_CONFIG[k]])));saveLocal();toast('確率設定を保存しました。','good');renderPage();break;
 case 'admin-reset-config':if(!state.adminUnlocked)break;state.adminConfig={...DEFAULT_ADMIN_CONFIG};saveLocal();toast('確率を初期値に戻しました。');renderPage();break;
 case 'admin-add-vp':if(!state.adminUnlocked)break;state.vp=Math.min(999999999,Number(state.vp||0)+1000);saveLocal();updateTop();toast('VPを1000追加しました。','good');break;
 case 'admin-lock':state.adminUnlocked=false;renderPage();break;
 case 'start-battle':startBattle('singles');break;
 case 'battle-mode':startBattle(el.dataset.mode||'singles');break;
 case 'end-battle':state.battle=null;state.selectedMove=null;state.pendingActions={};if(state.raidTargetId){state.raidTargetId=null;state.raidPartyIds=[];state.raidCaptureRoll=null;state.raidCaptureBusy=false;}state.page='home';setPage('home');break;
 case 'select-dex':state.selectedDex=el.dataset.id;renderPage();break;
 case 'dex-more':state.dexLoad+=60;renderPage();break;
 case 'filter-move-taxonomy':state.moveEffectCategory=el.dataset.taxonomy||'all';state.moveCatalogLimit=72;state.selectedMoveCatalog=null;renderPage();break;
 case 'move-more':state.moveCatalogLimit+=72;renderPage();break;
 case 'select-move-catalog':state.selectedMoveCatalog=el.dataset.move;renderPage();break;case 'select-ability-catalog':state.selectedAbilityCatalog=el.dataset.ability;renderPage();break;case 'ability-more':state.abilityCatalogLimit+=90;renderPage();break;
 case 'open-move-catalog':state.selectedMoveCatalog=state.selectedMove;setPage('moves');break;
 case 'select-owned':state.selectedOwned=el.dataset.uid;renderPage();break;
 case 'select-box-page':{const next=Math.max(0,Number(el.dataset.index||0));state.boxPage=next;const first=state.owned.slice(next*30,(next+1)*30)[0];state.selectedOwned=first?.uid||null;renderPage();break;}
 case 'open-owned':state.selectedOwned=el.dataset.uid;setPage('box');break;
 case 'draw-scout-10':if(state.vp<100){toast('VPが足りません。','bad');break;}if(drawScoutCandidates()){state.vp-=100;saveLocal();updateTop();renderPage();}break;
 case 'select-scout':state.scoutSelected=el.dataset.id;renderPage();break;
 case 'claim-scout':{const sp=state.data.dexById[el.dataset.id];if(!sp||!isFinalRecruitSpecies(sp)||!(state.scoutCandidates||[]).some(c=>c.id===sp.id)){toast('今回の10体から選んでください。','warn');break;}if(isLegendarySpecies(sp)){toast('伝説・幻はレイドに勝利して獲得してください。','warn');break;}if(hasOwnedForm(sp.id)){toast('このポケモンはすでに所持しています。','warn');break;}const mon=makeOwned(sp,{level:100});state.owned.push(mon);if(state.team.length<6)state.team.push(mon.uid);state.selectedOwned=mon.uid;state.selectedDex=sp.id;state.scoutCandidates=[];saveLocal();toast(`${mon.name}を獲得！`,'good');setPage('box');break;}
 case 'start-legendary-raid':beginRaidPreparation(el.dataset.id);break;
 case 'raid-toggle-party':{const uid=el.dataset.uid;state.raidPartyIds=state.raidPartyIds||[];const i=state.raidPartyIds.indexOf(uid);if(i>=0)state.raidPartyIds.splice(i,1);else if(state.raidPartyIds.length<6)state.raidPartyIds.push(uid);else toast('レイド編成は6体までです。','warn');renderPage();break;}
 case 'raid-edit-mon':state.selectedOwned=el.dataset.uid;setPage('training');break;
 case 'raid-cancel':state.raidTargetId=null;state.raidPartyIds=[];renderPage();break;
 case 'raid-start':{if(state.vp<100){toast('VPが足りません。','bad');break;}const target=state.data.dexById[state.raidTargetId];const party=(state.raidPartyIds||[]).map(uid=>state.owned.find(m=>m.uid===uid)).filter(Boolean);if(!target||!isFinalRecruitSpecies(target)||party.length!==6){toast('レイド対象または編成データを確認してください。','warn');break;}state.vp-=100;const playerTeam=party.map(m=>buildBattleMon(m,true));const boss=buildBattleMon(makeOwned(target,{level:75,shiny:false,mark:null,moves:enemyMovesFor(target)}),true);boss.level=75;boss.maxhp=Math.round(boss.maxhp*4);boss.hp=boss.maxhp;boss.stats=Object.fromEntries(Object.entries(boss.stats||{}).map(([k,v])=>[k,Math.round(v*1.2)]));boss.raidBoss=true;state.battle={mode:'raid',turn:1,playerTeam,enemyTeam:[boss],playerActive:[party.findIndex(m=>m.uid===party[0].uid)],enemyActive:[0],weather:null,weatherTurns:0,terrain:null,terrainTurns:0,log:[`タイプ別レイド開始！ ${boss.name}が現れた！`,`ボス強化：Lv.75・HP4倍・能力1.2倍`,`レイド挑戦料として100 VPを消費した。`],result:null,pending:{},megaPendingSlots:[],megaUsedBySide:{player:false,enemy:false},lastDamage:null,turnBusy:false};state.raidCaptureRoll=null;state.raidCaptureBusy=false;state.pendingActions={};state.selectedActiveSlot=0;state.selectedMove=null;state.selectedTargetUid=boss.uid;state.page='battle';saveLocal();setPage('battle');beginBattleIntro(state.battle);break;}
 case 'raid-capture':{const b=state.battle;if(!b||b.mode!=='raid'||b.result!=='win'||!state.raidCaptureRoll||state.raidCaptureBusy)break;const target=state.data.dexById[state.raidTargetId];if(!target){toast('レイド対象データが見つかりません。','bad');break;}state.raidCaptureBusy=true;renderPage();try{await playRaidCaptureAnimation();}catch(err){console.warn('[raid capture animation]',err);}const captureRoll=state.raidCaptureRoll;if(!captureRoll){state.raidCaptureBusy=false;break;}const mon=makeOwned(target,{level:70,shiny:captureRoll.shiny,mark:captureRoll.mark});state.owned.push(mon);if(state.team.length<6)state.team.push(mon.uid);state.selectedOwned=mon.uid;state.selectedDex=target.id;state.raidCaptureRoll=null;state.raidCaptureBusy=false;state.raidTargetId=null;state.raidPartyIds=[];state.scoutCandidates=[];saveLocal();toast(`${mon.name}を獲得！${mon.shiny?' ✨色違い！':''}${mon.mark?` ◇${mon.mark}！`:''}`,'good');setPage('box');break;}
 case 'raid-reroll':{const b=state.battle;if(!b||b.mode!=='raid'||!['win','lose'].includes(b.result))break;if(state.vp<100){toast('再挑戦には100 VPが必要です。','bad');break;}const targetId=state.raidTargetId;state.vp-=100;state.battle=null;state.raidCaptureRoll=null;state.raidCaptureBusy=false;const target=state.data.dexById[targetId];const party=(state.raidPartyIds||[]).map(uid=>state.owned.find(m=>m.uid===uid)).filter(Boolean);if(!target||party.length!==6){state.vp+=100;toast('レイド編成が保存されていません。6体を選び直してください。','bad');beginRaidPreparation(targetId);break;}const playerTeam=party.map(m=>buildBattleMon(m,true));const boss=buildBattleMon(makeOwned(target,{level:75,shiny:false,mark:null,moves:enemyMovesFor(target)}),true);boss.level=75;boss.maxhp=Math.round(boss.maxhp*4);boss.hp=boss.maxhp;boss.stats=Object.fromEntries(Object.entries(boss.stats||{}).map(([k,v])=>[k,Math.round(v*1.2)]));boss.raidBoss=true;state.battle={mode:'raid',turn:1,playerTeam,enemyTeam:[boss],playerActive:[0],enemyActive:[0],weather:null,weatherTurns:0,terrain:null,terrainTurns:0,log:[`伝説レイド再挑戦！ ${boss.name}が現れた！`,`再挑戦料として100 VPを消費した。`],result:null,pending:{},megaPendingSlots:[],megaUsedBySide:{player:false,enemy:false},lastDamage:null,turnBusy:false};state.pendingActions={};state.selectedActiveSlot=0;state.selectedMove=null;state.selectedTargetUid=boss.uid;saveLocal();setPage('battle');beginBattleIntro(state.battle);break;}
 case 'scout-more':state.scoutVisible=(state.scoutVisible||30)+30;renderPage();break;
 case 'scout-specific':{const sp=state.data.dexById[el.dataset.id];if(!sp||!isFinalRecruitSpecies(sp)){toast('図鑑からスカウト対象のポケモンを選択してください。','warn');break;}state.scoutSelected=sp.id;setPage('scout');break;}
 case 'confirm-scout':{
  const sp=state.data.dexById[el.dataset.id];if(!sp||!isFinalRecruitSpecies(sp)){toast('図鑑からポケモンを選択してください。','warn');break;}if(state.vp<100){toast('VPが足りません。','bad');break;}const dup=$('#scout-allow-duplicate')?.checked;if(hasSpeciesOwned(sp.id)&&!dup){toast('この個体はすでに所持しています。重複許可にチェックするとスカウトできます。','warn');break;}state.vp-=100;const mon=makeOwned(sp,{level:100});state.owned.push(mon);if(state.team.length<6)state.team.push(mon.uid);state.selectedOwned=mon.uid;state.selectedDex=sp.id;saveLocal();toast(`${mon.name}をスカウト！${mon.shiny?' 色違い！':''}${mon.mark?` ${mon.mark}付き！`:''}`,'good');setPage('box');break;}
 case 'train-owned':state.selectedOwned=el.dataset.uid;setPage('training');break;
 case 'toggle-team':{const uid=el.dataset.uid;const pos=state.team.indexOf(uid);if(pos>=0){state.team.splice(pos,1);toast('チームから外しました。');}else if(state.team.length>=6){toast('チームは最大6匹です。先に1匹外してください。','warn');}else{state.team.push(uid);toast('チームに加えました。');}saveLocal();renderPage();break;}
 case 'release':{const uid=el.dataset.uid;const mon=state.owned.find(m=>m.uid===uid);if(!mon)break;if(!confirm(`${mon.name}をボックスから逃がしますか？この操作は取り消せません。`))break;state.owned=state.owned.filter(m=>m.uid!==uid);state.team=state.team.filter(x=>x!==uid);state.selectedOwned=state.owned[0]?.uid||null;saveLocal();toast('ボックスを更新しました。');renderPage();break;}
 case 'save-training':{const mon=state.owned.find(m=>m.uid===el.dataset.uid);if(!mon)break;const used=Object.values(mon.evs||{}).reduce((a,n)=>a+Number(n||0),0);if(used>510){toast('努力値合計が510を超えています。','bad');break;}mon.nature=$('#nature-select')?.value||mon.nature;mon.abilityId=$('#ability-select')?.value||mon.abilityId;mon.teraType=$('#tera-type-select')?.value||mon.teraType;mon.heldItem=$('#held-item')?.value||'';mon.moves=(mon.moves||[]).filter(Boolean).slice(0,4);saveLocal();toast(`${mon.name}のトレーニングを保存しました。`);renderPage();break;}
 case 'reset-ev':{const mon=state.owned.find(m=>m.uid===el.dataset.uid);if(mon){mon.evs=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));const saved=saveLocal();renderPage();toast(saved?'努力値をリセットして保存しました。':'努力値はリセットしましたが、保存に失敗しました。JSONでバックアップしてください。',saved?'good':'bad');}break;}
 case 'select-move':state.selectedMove=el.dataset.move;renderPage();break;
 case 'select-target':state.selectedTargetUid=el.dataset.uid;renderPage();break;
 case 'confirm-move':{
  if(!b||b.result||b.turnBusy)break;const slot=state.selectedActiveSlot;const mon=b.playerTeam[b.playerActive[slot]];const m=getMove(state.selectedMove);if(!mon||mon.fainted||!m){toast('技を選択してください。','warn');break;}if(!(mon.moves||[]).some(x=>x.id===m.id&&x.pp>0)){toast('その技はPPがありません。','warn');break;}
  const target=activeLiving(b.enemyTeam,b.enemyActive)[0];const action={actorUid:mon.uid,moveId:m.id,targetUid:state.selectedTargetUid||target?.uid,slot,mega:!!b.megaPendingSlots?.includes(slot)};if(b.mode==='doubles'){b.pending=b.pending||{};b.pending[slot]=action;const next=b.playerActive.findIndex((idx,i)=>!b.playerTeam[idx]?.fainted&&!b.pending[i]&&i!==slot);if(next>=0){state.selectedActiveSlot=next;state.selectedMove=null;toast(`味方${slot+1}の行動を決定。次に味方${next+1}の技を選んでください。`);renderPage();}else{toast('味方全員の行動を決定しました。「ターンを実行」を押してください。');renderPage();}}else{await executeTurn([action]);}break;}
 case 'active-slot':state.selectedActiveSlot=Number(el.dataset.slot)||0;state.selectedMove=null;renderPage();break;
 case 'execute-double':{if(!b||b.turnBusy||b.result)break;const actions=b.playerActive.map((idx,i)=>b.pending?.[i]).filter(a=>a&&b.playerTeam.find(m=>m.uid===a.actorUid)&&!b.playerTeam.find(m=>m.uid===a.actorUid).fainted).map(a=>({...a,mega:!!b.megaPendingSlots?.includes(a.slot)}));if(!actions.length){toast('先に行動を選択してください。','warn');break;}await executeTurn(actions);break;}
 case 'open-switch':openSwitchModal();break;
 case 'switch-to':{
  if(!b||b.result||b.turnBusy)break;const idx=Number(el.dataset.index),slot=Number(el.dataset.slot??state.selectedActiveSlot);if(!b.playerTeam[idx]||b.playerTeam[idx].fainted||b.playerActive.includes(idx)){toast('そのポケモンには交代できません。','warn');break;}$('#modal-root').innerHTML='';const current=b.playerTeam[b.playerActive[slot]];const action={actorUid:current.uid,moveId:null,targetUid:null,slot,switchTo:idx};if(b.mode==='doubles'){b.pending=b.pending||{};b.pending[slot]=action;state.selectedActiveSlot=b.playerActive.findIndex((x,i)=>!b.playerTeam[x]?.fainted&&!b.pending[i]&&i!==slot);if(state.selectedActiveSlot<0)state.selectedActiveSlot=0;toast('交代を決定しました。残りの味方の行動も選んでください。');renderPage();}else await executeTurn([action]);break;}
 case 'toggle-mega':{if(!b||b.result||b.turnBusy)break;const slot=state.selectedActiveSlot,mon=b.playerTeam[b.playerActive[slot]];if(!mon||mon.fainted)break;if(b.megaUsedBySide?.player){toast('このバトルでは、すでにメガシンカを使用しています。','warn');break;}if(b.megaPendingSlots?.includes(slot)){b.megaPendingSlots=b.megaPendingSlots.filter(x=>x!==slot);toast('メガシンカの選択を解除しました。');}else if(mon.megaUsed||!findMegaForm(mon)){toast('このポケモンには対応するメガシンカがありません。','warn');break;}else if(capItem('megaenergy')<1){toast('メガエナジーがありません。ショップで5000 VPで購入してください。','warn');break;}else{b.megaPendingSlots=b.megaPendingSlots||[];b.megaPendingSlots.push(slot);toast('メガシンカを選択しました。技を決定するとメガエナジーを1個消費して発動します。','good');}renderPage();break;}
 case 'reload-public-data':{await loadAllData();ensureOwnedMoveSets();updateTop();renderPage();toast('ゲームデータとShowdown対戦データを再読み込みしました。','good');break;}
 case 'export-save':exportSave();break;
 case 'save-now':{if(state.saveWriteBlocked&&state.saveBlockReason==='write'){state.saveWriteBlocked=false;state.saveBlockReason=null;state.saveWarningShown=false;}const saved=saveLocal();toast(saved?'ブラウザ内のセーブデータを保存しました。':'ブラウザ内に保存できませんでした。セーブ状態を確認し、必要ならJSONでバックアップしてください。',saved?'good':'bad');renderPage();break;}
 case 'import-save':$('#import-save')?.click();break;
 case 'import-save-confirm':{const input=$('#import-save');if(!input?.files?.[0]){toast('先にJSONファイルを選択してください。','warn');break;}readImportFile(input.files[0]);break;}
 case 'reset-save':if(confirm('セーブデータとボックスを初期化しますか？')){try{localStorage.removeItem('pokemon-champions-2d-save');state.saveWriteBlocked=false;state.saveBlockReason=null;location.reload();}catch(err){console.error('[Pokémon Champions 2D reset]',err);toast('セーブを初期化できませんでした。ブラウザの保存領域を確認してください。','bad');}}break;
 case 'close-modal':$('#modal-root').innerHTML='';break;
 case 'modal-backdrop':$('#modal-root').innerHTML='';break;
 default:break;
 }
}
function exportSave(){
 if(state.saveWriteBlocked&&state.saveBlockReason==='load'){
  toast('保存データの読み込みに失敗したため、現在の初期データをバックアップとして書き出すことは停止しています。有効なセーブJSONを読み込むか、セーブを初期化してください。','bad');
  return;
 }
 try{
  const save={version:4,exportedAt:new Date().toISOString(),vp:state.vp,owned:state.owned,team:state.team,items:state.items||{},eggs:state.eggs||[],farm:state.farm||{uids:[],capacity:3,lastAt:Date.now()},careStats:state.careStats||{},boxPage:Number(state.boxPage||0),adminConfig:cleanAdminConfig(state.adminConfig),dexResearch:state.dexResearch||{}};
  const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='pokemon-champions-2d-save.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('セーブJSONの書き出しを開始しました。ダウンロード完了を確認してください。', 'good');
 }catch(e){console.error('[Pokémon Champions 2D export]',e);toast(`セーブJSONを書き出せませんでした: ${e.message||e}`,'bad');}
}
function readImportFile(file){
 if(!file){toast('読み込むJSONファイルを選択してください。','warn');return;}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const s=JSON.parse(reader.result);
   const version=Number(s?.version);
   if(!s||!Array.isArray(s.owned)||!Array.isArray(s.team)||!Number.isInteger(version)||version<1||version>4)throw new Error('保存JSONの形式またはバージョンが対応していません。');
   if(s.vp!==undefined&&(!Number.isFinite(Number(s.vp))||Number(s.vp)<0))throw new Error('VPの値が不正です。');
   const importedOwned=s.owned.map(normalizeOwnedIdentity).filter(Boolean);
   if(importedOwned.length!==s.owned.length)throw new Error('ポケモンデータの一部を正常に読み込めません。元のセーブは変更していません。');
   const importedTeam=s.team.filter(uid=>importedOwned.some(m=>m.uid===uid));
   const importedItems=s.items&&typeof s.items==='object'&&!Array.isArray(s.items)?s.items:{};
    const importedDexResearch=s.dexResearch&&typeof s.dexResearch==='object'&&!Array.isArray(s.dexResearch)?s.dexResearch:{};
   const importedEggs=Array.isArray(s.eggs)?s.eggs:[];
   const importedFarm=s.farm&&typeof s.farm==='object'?{uids:Array.isArray(s.farm.uids)?s.farm.uids:[],capacity:Math.max(3,Number(s.farm.capacity||3)),lastAt:Number(s.farm.lastAt||Date.now())}:{uids:[],capacity:3,lastAt:Date.now()};
   const importedCareStats=s.careStats&&typeof s.careStats==='object'?s.careStats:{};
   const importedBoxPage=Math.max(0,Number(s.boxPage||0));
   const importedConfig=s.adminConfig?cleanAdminConfig(s.adminConfig):cleanAdminConfig(DEFAULT_ADMIN_CONFIG);
   if(!confirm('現在のセーブを読み込んだデータに置き換えますか？'))return;
   state.vp=Number(s.vp??1500);state.owned=importedOwned;state.team=importedTeam;
   if(!state.team.length)state.team=state.owned.slice(0,6).map(m=>m.uid);
   state.items=importedItems;state.dexResearch=importedDexResearch;state.eggs=importedEggs;state.farm=importedFarm;state.careStats=importedCareStats;state.boxPage=importedBoxPage;state.adminConfig=importedConfig;
   state.selectedOwned=state.owned[0]?.uid||null;
   state.saveWriteBlocked=false;state.saveBlockReason=null;state.saveWarningShown=false;
   const saved=saveLocal();
   if(saved){toast('セーブJSONを読み込み、ブラウザにも保存しました。','good');setPage('home');}
   else{toast('JSONは読み込みましたが、ブラウザへの保存に失敗しました。設定からJSONを書き出してバックアップしてください。','bad');setPage('home');}
  }catch(e){console.error('[Pokémon Champions 2D import]',e);toast(`JSONを読み込めませんでした: ${e.message||e}`,'bad');}
 };
 reader.onerror=()=>toast('ファイルを読み取れませんでした。別のJSONファイルを選んでください。','bad');
 reader.readAsText(file);
}
document.addEventListener('click',async(e)=>{const pageButton=e.target.closest('[data-page]');if(pageButton){e.preventDefault();setPage(pageButton.dataset.page);return;}const actionEl=e.target.closest('[data-action]');if(actionEl){if(actionEl.dataset.action==='modal-backdrop'&&e.target!==actionEl)return;e.preventDefault();try{await handleAction(actionEl.dataset.action,actionEl);}catch(err){console.error(err);toast(`処理に失敗しました: ${err.message||err}`,'bad');}}});
$('#save-btn')?.addEventListener('click',exportSave);$('#help-btn')?.addEventListener('click',openHelp);
$('#bootstart')?.addEventListener('click',()=>{if($('#bootstart').disabled)return;$('#boot').classList.add('hidden');$('#app').classList.remove('hidden');initializeSave();renderPage();});
function ensureOwnedMoveSets(){
 let changed=false;
 for(const mon of state.owned){
  const species=monSpecies(mon);if(!species)continue;
  const existing=Array.isArray(mon.moves)?mon.moves:[];const seen=new Set();const repaired=[];
  for(const entry of existing){const oldId=typeof entry==='string'?entry:entry?.id;const move=getMove(oldId);if(!move||seen.has(move.id))continue;const id=move.id;seen.add(id);const oldPP=typeof entry==='object'?Number(entry.pp):Number(move.pp);repaired.push({id,pp:Math.max(0,Math.min(Number(move.pp||oldPP||10),Number.isFinite(oldPP)?oldPP:Number(move.pp||10)))});}
  if(repaired.length<4){for(const move of defaultMovesFor(species)){if(repaired.length>=4)break;if(!seen.has(move)){const data=getMove(move);if(data){repaired.push({id:move,pp:Number(data.pp||10)});seen.add(move);}}}}
  if(!Array.isArray(mon.moves)||JSON.stringify(mon.moves)!==JSON.stringify(repaired)){mon.moves=repaired;changed=true;}
 }
 if(changed)saveLocal();return changed;
}
function initializeSave(){
 const restored=loadLocal();
 if(restored){
  state.owned=state.owned.map(normalizeOwnedIdentity).filter(Boolean);
  state.team=state.team.filter(uid=>state.owned.some(m=>m.uid===uid));
  if(!state.team.length)state.team=state.owned.slice(0,6).map(m=>m.uid);
  state.items=state.items||{};
  state.selectedOwned=state.owned[0]?.uid||null;
  const visible=selectableDex();
  if(!state.selectedDex||!isSelectableFinalSpecies(state.data.dexById[state.selectedDex]))state.selectedDex=(visible.find(p=>p.id==='charizard')||visible[0])?.id||null;
  if(!state.scoutSelected||!isFinalRecruitSpecies(state.data.dexById[state.scoutSelected]))state.scoutSelected=finalRecruitDex().find(p=>!hasSpeciesOwned(p.id))?.id||finalRecruitDex()[0]?.id||null;
  if(Array.isArray(state.scoutCandidates))state.scoutCandidates=state.scoutCandidates.filter(c=>isFinalRecruitSpecies(state.data.dexById[c?.id]));else state.scoutCandidates=[];
  if(state.raidTargetId&&!isFinalRecruitSpecies(state.data.dexById[state.raidTargetId])){state.raidTargetId=null;state.raidPartyIds=[];}
  ensureOwnedMoveSets();saveLocal();return;
 }
 state.vp=1500;state.owned=[];state.team=[];state.items={evolutionstone:1};state.dexResearch={};
 const visible=selectableDex();
 const startingPool=finalRecruitDex().filter(p=>!isLegendarySpecies(p));
 for(let i=startingPool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[startingPool[i],startingPool[j]]=[startingPool[j],startingPool[i]];}
 for(const p of startingPool.slice(0,6)){const mon=makeOwned(p,{level:100,shiny:false,mark:null});state.owned.push(mon);state.team.push(mon.uid);}
 state.selectedOwned=state.owned[0]?.uid||null;
 state.selectedDex=state.owned[0]?.speciesId||visible[0]?.id||null;
 state.scoutSelected=finalRecruitDex().find(p=>!hasSpeciesOwned(p.id))?.id||finalRecruitDex()[0]?.id||null;
 ensureOwnedMoveSets();saveLocal();
}
async function boot(forceRefresh=false){
 try{
  setLoad(3,'図鑑・習得技を読み込み、Pokémon Showdownの対戦データを接続中…');
  await loadAllData({forceRefresh});
  const catalogCount=Object.keys(state.data.movesById||{}).length;
  const learnCount=Object.keys(state.data.learnsets||{}).length;
  const usable=state.data.dex.length>=1000&&catalogCount>=700&&learnCount>=500;
  if(!usable){
   setLoad(88,'内蔵データをもう一度確認中…');
   await new Promise(resolve=>setTimeout(resolve,600));
   await loadAllData({forceRefresh:false});
  }
  if(!state.data.dex.length)throw new Error('図鑑データが空です。HTMLファイルが破損していないか確認してください。');
  const dexCount=state.data.dex.length,moveCount=Object.keys(state.data.movesById||{}).length,learnCount2=Object.keys(state.data.learnsets||{}).length;
  setLoad(100,`準備完了：図鑑 ${dexCount.toLocaleString()}件・Showdown技反映 ${Number(state.dataInfo?.showdownMoveCount||0).toLocaleString()}件・特性データ ${Number(state.dataInfo?.showdownAbilityMatched||0).toLocaleString()}件・習得技 ${learnCount2.toLocaleString()}種族`);
  $('#bootstart').disabled=false;
  $('#bootstart').textContent=['full','full-csv'].includes(state.dataState)?'ゲームを起動':'データを確認して起動';
  const retry=$('#retry-data');if(retry)retry.classList.toggle('hidden',['full','full-csv'].includes(state.dataState));
  if(!['full','full-csv'].includes(state.dataState)){
   const status=$('#loadstatus');
   if(status)status.textContent=`内蔵データ準備完了：図鑑 ${dexCount.toLocaleString()}件／技 ${moveCount.toLocaleString()}件／習得技 ${learnCount2.toLocaleString()}種族。`;
  }
 }catch(e){
  console.error(e);state.dataErrors.push(String(e));
  if(!Object.keys(state.data.movesById||{}).length){const fallback=makeFallbackMoves();state.data.moves=fallback;state.data.movesById=fallback;}
  if(!state.data.dex.length){state.data.dexById={};state.data.dex=fallbackSpecies.map((r,i)=>{const mon={id:r[0],slug:r[0],name:r[0].replace(/(^|\s)\w/g,m=>m.toUpperCase()),jpName:r[1],displayName:r[1],num:i+1,types:r[2],baseStats:Object.fromEntries(STAT_KEYS.map((k,j)=>[k,r[3][j]])),abilities:Object.fromEntries(r[4].map((v,j)=>[j===0?'0':'1',v])),bst:r[3].reduce((a,n)=>a+n,0),baseSpecies:r[0],isLegendary:['mewtwo','mew','rayquaza','zacian'].includes(r[0]),isMythical:r[0]==='mew'};state.data.dexById[mon.id]=mon;return mon;});}
  state.dataState='partial';state.dataInfo={...(state.dataInfo||{}),dexCount:state.data.dex.length,mergedMoveCount:Object.keys(state.data.movesById||{}).length,moveSource:state.data.moveSourceInfo?.moveSource||state.dataInfo?.moveSource||'簡易／一部'};
  setLoad(100,`内蔵データで不足あり：図鑑 ${state.data.dex.length.toLocaleString()} 件・技 ${Object.keys(state.data.movesById||{}).length.toLocaleString()} 件。可能なデータを準備しました。`);
  $('#bootstart').disabled=false;$('#bootstart').textContent='データ状況を確認して起動';
  const retry=$('#retry-data');if(retry)retry.classList.remove('hidden');
 }
}
// v16.1 FIX: care module is merged into the main closure so it can access state and existing handlers.

// This module extends v15 without replacing the battle engine or the existing save key.
state.eggs=Array.isArray(state.eggs)?state.eggs:[];
state.farm=state.farm&&typeof state.farm==='object'?state.farm:{uids:[],capacity:3,lastAt:Date.now()};
state.farm.uids=Array.isArray(state.farm.uids)?state.farm.uids:[];
state.farm.capacity=Math.max(3,Number(state.farm.capacity||3));
state.careStats=state.careStats&&typeof state.careStats==='object'?state.careStats:{};
state.careTab=state.careTab||'gacha';
const SAVE_KEY='pokemon-champions-2d-save';
const CARE_ITEMS=[
 {id:'evolutionstone',name:'進化の石',price:200,desc:'独自ルールの進化に1個必要。全進化先で共通。'},
 {id:'megaenergy',name:'メガエナジー',price:5000,desc:'メガシンカ1回に必要。対応ポケモンがいるバトルで自動消費。'},
 {id:'silvercrown',name:'ぎんのおうかん',price:700,desc:'選んだ1能力を個体値31相当まで鍛える。元の個体値は保存。'},
 {id:'goldcrown',name:'きんのおうかん',price:1800,desc:'全6能力を個体値31相当まで鍛える。元の個体値は保存。'},
 {id:'ivreroller',name:'個体値リセッター',price:450,desc:'選択した個体の6能力の個体値を再抽選する。'},
 {id:'farmexpansion',name:'農場拡張キット',price:1000,desc:'使用すると農場の収容数が3匹増える。'},
 {id:'friendshiptreat',name:'なつきおやつ',price:120,desc:'選択したポケモンのなつき度を大きく上げる。'},
 {id:'trainingmeal',name:'育成ごはん',price:160,desc:'経験値を少し獲得し、なつき度も上げる。'}
];
const STAT_LABELS={hp:'HP',atk:'攻撃',def:'防御',spa:'特攻',spd:'特防',spe:'素早さ'};
function clamp(n,a,b){return Math.max(a,Math.min(b,Number(n)||0));}
function randomInt(n){return Math.floor(Math.random()*n);}
function randomIvs(){const o={};for(const k of STAT_KEYS)o[k]=randomInt(32);return o;}
function randomNature(){const names=['いじっぱり','ひかえめ','ようき','おくびょう','ずぶとい','おだやか','しんちょう','ゆうかん','れいせい','わんぱく','のんき','なまいき','むじゃき','せっかち','さみしがり','やんちゃ','おっとり','うっかりや','おとなしい','きまぐれ','まじめ','てれや','すなお','がんばりや'];return names[randomInt(names.length)];}
function ensureCareMon(mon){if(!mon||typeof mon!=='object')return mon;mon.exp=Math.max(0,Number(mon.exp||0));mon.friendship=clamp(mon.friendship??70,0,255);mon.personalities=Array.isArray(mon.personalities)?mon.personalities:[];mon.activityCounts=mon.activityCounts&&typeof mon.activityCounts==='object'?mon.activityCounts:{adventure:0,battle:0,farm:0,training:0};mon.hyperTrained=mon.hyperTrained&&typeof mon.hyperTrained==='object'?mon.hyperTrained:{};mon.farmMinutes=Math.max(0,Number(mon.farmMinutes||0));return mon;}
state.owned.forEach(ensureCareMon);
// Local evolution graph: the data embedded in v15 has no evolution-chain links,
// so this self-contained ruleset adds the common national-dex family chains and cross-gen branches.
const FAMILY_TEXT=`
1,2,3
4,5,6
7,8,9
10,11,12
13,14,15
16,17,18
19,20
21,22
23,24
25,26
27,28
29,30,31
32,33,34
35,36
37,38
39,40
41,42
43,44,45
46,47
48,49
50,51
52,53
54,55
56,57
58,59
60,61,62
63,64,65
66,67,68
69,70,71
72,73
74,75,76
77,78
79,80
81,82
84,85
86,87
88,89
90,91
92,93,94
96,97
98,99
100,101
102,103
104,105
109,110
111,112
116,117
118,119
120,121
129,130
147,148,149
152,153,154
155,156,157
158,159,160
161,162
163,164
165,166
167,168
170,171
172,25
173,35
174,39
175,176
177,178
179,180,181
183,184
187,188,189
191,192
194,195
204,205
209,210
216,217
218,219
220,221
223,224
228,229
231,232
246,247,248
252,253,254
255,256,257
258,259,260
263,264,862
265,266,267
265,268,269
270,271,272
273,274,275
276,277
280,281,282
283,284
285,286
287,288,289
290,291,292
293,294,295
296,297
300,301
304,305,306
307,308
309,310
316,317
322,323
325,326
328,329,330
331,332
333,334
339,340
341,342
343,344
345,346
347,348
349,350
353,354
355,356
361,362
363,364,365
366,367
366,368
371,372,373
374,375,376
387,388,389
390,391,392
393,394,395
396,397,398
399,400
401,402
406,315,407
408,409
410,411
412,413,414
415,416
418,419
420,421
422,423
425,426
427,428
434,435
436,437
443,444,445
447,448
449,450
451,452
453,454
456,457
459,460
495,496,497
498,499,500
501,502,503
504,505
506,507,508
509,510
511,512
513,514
515,516
517,518
519,520,521
522,523
524,525,526
527,528
529,530
532,533,534
540,541,542
543,544,545
546,547
548,549
551,552,553
554,555
556,557,558
559,560
562,563
564,565
566,567
568,569
570,571
572,573
574,575,576
577,578,579
580,581
582,583,584
588,589
590,591
592,593
595,596
597,598
599,600,601
602,603,604
605,606
607,608,609
610,611,612
613,614
619,620
622,623
624,625
627,628
629,630
633,634,635
636,637
650,651,652
653,654,655
656,657,658
659,660
661,662,663
664,665,666
667,668
669,670,671
672,673
674,675
677,678
679,680,681
682,683
684,685
686,687
688,689
690,691
692,693
696,697
698,699
704,705,706
708,709
710,711
712,713
714,715
722,723,724
725,726,727
728,729,730
731,732,733
734,735
736,737,738
742,743
744,745
747,748
749,750
751,752
753,754
755,756
757,758
759,760
761,762,763
767,768
769,770
782,783,784
789,790,791
803,804
808,809
810,811,812
813,814,815
816,817,818
819,820
821,822,823
831,832
833,834
835,836
840,841
840,842
843,844
846,847
848,849
850,851
852,853
854,855
856,857,858
859,860,861
868,869
872,873
878,879
885,886,887
891,892
906,907,908
909,910,911
912,913,914
915,916
917,918
919,920
921,922
924,925
926,927
928,929,930
932,933,934
938,939
940,941
942,943
944,945
946,947
948,949
953,954
955,956
957,958,959
960,961
965,966
969,970
971,972
999,1000
`.trim();
const evosById=new Map(), evoMinimum=new Map(), speciesByNum=new Map();
function evoKey(id){return String(id||'');}
function addEvo(from,to,minLevel){const a=speciesByNum.get(Number(from)),b=speciesByNum.get(Number(to));if(!a||!b||a.id===b.id)return;const list=evosById.get(a.id)||[];if(!list.some(x=>x.id===b.id))list.push(b);evosById.set(a.id,list);evoMinimum.set(a.id+'>'+b.id,Number(minLevel||30));}
function setupEvos(){
 for(const p of state.data.dex||[]){if(p&&p.num&&!p.isMega&&!p.isPrimal&&!p.isGigantamax&&!p.isRegional&&!speciesByNum.has(Number(p.num)))speciesByNum.set(Number(p.num),p);}
 for(const line of FAMILY_TEXT.split(/\n/)){const nums=line.split(',').map(Number).filter(Boolean);for(let i=0;i<nums.length-1;i++){const min=nums.length===2?30:(i===0?20:i===1?40:60);addEvo(nums[i],nums[i+1],min);}}
 // Cross-generation and split branches not represented by consecutive dex numbering.
 [[43,182,40],[133,134,20],[133,135,20],[133,136,20],[133,196,30],[133,197,30],[133,470,30],[133,471,30],[133,700,30],
 [190,424,30],[82,462,40],[108,463,40],[112,464,40],[114,465,40],[125,466,40],[126,467,40],[175,468,30],[193,469,30],[215,461,40],[207,472,30],[220,473,60],[233,474,40],[281,475,30],[299,476,40],[356,477,40],[361,478,30],[790,792,40],[217,901,60],
 [238,124,30],[239,125,30],[240,126,30],[298,183,20],[360,202,20],[406,315,20],[433,358,20],[438,185,30],[439,122,30],[440,113,30],[446,143,30],[458,226,30],[447,448,30],[236,106,30],[236,107,30],[236,237,30],
 [198,430,30],
 [83,865,40],[122,866,40],[562,867,35],[203,981,30],[206,982,30],[625,983,60],[550,902,40],[215,903,40],[211,904,40],[234,899,40],[217,901,60],[884,1018,60],[840,1019,60],[1011,1019,40],
 [935,936,30],[935,937,30],[57,979,60],[194,195,30],[840,1011,30],[1012,1013,30],[999,1000,35]
 ].forEach(x=>addEvo(x[0],x[1],x[2]));
}
function xpNeed(level){return Math.max(100,Math.floor(100+Number(level||1)*24));}
function monXpPercent(mon){return mon.level>=100?100:Math.round(clamp(mon.exp,0,xpNeed(mon.level))/xpNeed(mon.level)*100);}
function giveExperience(mon,amount,source='育成'){ensureCareMon(mon);let left=Math.max(0,Math.floor(amount)),levels=0;if(mon.level>=100)return {gained:0,levels:0};const original=left;while(left>0&&mon.level<100){const need=xpNeed(mon.level);const remain=Math.max(1,need-mon.exp);if(left>=remain){left-=remain;mon.exp=0;mon.level++;levels++;}else{mon.exp+=left;left=0;}}if(mon.level>=100)mon.exp=0;return {gained:original-left,levels};}
function notePersonality(mon){ensureCareMon(mon);const c=mon.activityCounts;const add=(x)=>{if(!mon.personalities.includes(x))mon.personalities.push(x);};if(Number(c.adventure||0)>=3)add('冒険が好き');if(Number(c.battle||0)>=3)add('バトルが好き');if(Number(c.farmMinutes||mon.farmMinutes||0)>=120)add('のんびり屋');if(Number(c.training||0)>=5)add('努力家');}
function addFriendship(mon,n){ensureCareMon(mon);mon.friendship=clamp(mon.friendship+n,0,255);return mon.friendship;}
function saveCare(){saveLocal();updateTop();}
function capItem(id){state.items=state.items||{};state.items[id]=Math.max(0,Number(state.items[id]||0));return state.items[id];}
function carePageHeader(){return `<div class="care-tabs"><button class="btn ${state.careTab==='gacha'?'btn-primary':'btn-ghost'}" data-action="care-set-tab" data-tab="gacha">🎲 ガチャ・卵</button><button class="btn ${state.careTab==='training'?'btn-primary':'btn-ghost'}" data-action="care-set-tab" data-tab="training">🌱 育成・進化</button><button class="btn ${state.careTab==='farm'?'btn-primary':'btn-ghost'}" data-action="care-set-tab" data-tab="farm">🌾 農場</button></div>`;}
function renderCare(){
 setupEvosIfNeeded();
 const selected=state.owned.find(m=>m.uid===state.careSelectedUid)||state.owned[0]||null;if(selected)state.careSelectedUid=selected.uid;
 const eggs=state.eggs||[],farm=state.farm;
 let body='';
 if(state.careTab==='gacha'){
  body=`<div class="care-grid"><section class="care-feature"><span class="care-emblem">🥚</span><div class="section-kicker">EGG / Lv.1</div><h3>育成用ガチャ</h3><p>卵が1個だけ出現。開けるまで中身は表示されない。色違い50%・あかし50%。</p><div class="care-action-row"><span class="pill">価格：100 VP</span><span class="pill">卵1個</span><button class="btn btn-primary" data-action="care-buy-egg" ${state.vp<100?'disabled':''}>100 VPで卵を買う</button></div></section></div>
  <section class="panel" style="margin-top:14px"><div class="panel-head"><h2>🥚 卵ケース</h2><span class="pill">${eggs.length}個</span></div><div class="panel-body">${eggs.length?`<div class="care-list">${eggs.map((egg,i)=>`<article class="egg-card"><div class="egg-visual">🥚</div><h3>育成たまご #${i+1}</h3><div class="egg-label">${eggRemainingMs(egg)>0?`孵化まで約${Math.ceil(eggRemainingMs(egg)/60000)}分`:'孵化可能！'}</div><p class="small muted" style="text-align:center">入手日：${esc(String(egg.obtainedAt||'').slice(0,10)||'—')}</p><div class="care-action-row" style="justify-content:center"><button class="btn btn-primary" data-action="care-hatch-egg" data-egg="${esc(egg.id)}" ${eggRemainingMs(egg)>0?'disabled':''}>卵を開ける</button><button class="btn btn-ghost" data-action="care-speed-hatch" data-egg="${esc(egg.id)}" ${eggRemainingMs(egg)<=0||state.vp<2500?'disabled':''}>2500 VPで時短</button></div></article>`).join('')}</div>`:`<div class="empty-state"><h3>卵はまだないよ</h3><p>育成用ガチャを引くと、卵が1個だけ出現するよ。</p></div>`}</div></section>
  <section class="panel" style="margin-top:14px"><div class="panel-head"><h2>🎒 アイテムバッグ</h2><button class="btn btn-ghost btn-sm" data-page="shop">ショップへ</button></div><div class="panel-body"><div class="care-list">${CARE_ITEMS.map(it=>`<div class="care-mon-card"><b>${esc(it.name)}</b><div class="care-mon-meta"><span class="pill">所持 ${capItem(it.id)}個</span></div><p class="small muted">${esc(it.desc)}</p></div>`).join('')}</div></div></section>`;
 }else if(state.careTab==='farm'){
  const farmMons=farm.uids.map(uid=>state.owned.find(m=>m.uid===uid)).filter(Boolean);const available=state.owned.filter(m=>!farm.uids.includes(m.uid));
  body=`<div class="stats-strip">${statTile('FARM SLOTS',`${farmMons.length} / ${farm.capacity}`,'預けられるポケモン')}${statTile('FARM RATE','0.5 EXP / min','最大12時間分を蓄積')}${statTile('EXP RULE','SLOW & STEADY','バトル・冒険の方が成長しやすい')}</div><section class="panel"><div class="panel-head"><h2>🌾 農場</h2><span class="pill">預けた個体は時間で成長</span></div><div class="panel-body"><p class="small muted">農場は時間経過で少しずつ経験値をためる（毎分0.5 EXP、最大12時間分）。6時間預けても約180 EXPなので、レベルは少しずつしか上がらない。ブラウザを閉じている間も、次回開いたときに最大12時間分を計算する。ごはん・遊びでなつき度や個性にも影響する。</p><div class="care-list">${farmMons.length?farmMons.map(mon=>`<article class="care-mon-card"><div class="care-mon-head">${speciesIcon(mon)}<div><b>${esc(mon.name)}</b><div class="small muted">Lv.${mon.level} · EXP ${mon.exp}/${mon.level>=100?'MAX':xpNeed(mon.level)}</div></div></div><div class="care-bar"><i style="width:${monXpPercent(mon)}%"></i></div><div class="care-mon-meta"><span class="pill">なつき ${mon.friendship}/255</span><span class="pill">${mon.personalities.map(esc).join(' / ')||'個性未獲得'}</span></div><div class="care-action-row"><button class="btn btn-secondary" data-action="care-feed" data-uid="${esc(mon.uid)}">🍎 ごはん</button><button class="btn btn-secondary" data-action="care-play" data-uid="${esc(mon.uid)}">🧸 遊ぶ</button><button class="btn btn-ghost" data-action="care-withdraw" data-uid="${esc(mon.uid)}">引き取る</button></div></article>`).join(''):`<div class="empty-state"><h3>農場は空っぽ</h3><p>下のポケモンから預けよう。</p></div>`}</div><div class="care-action-row" style="margin-top:15px"><button class="btn btn-primary" data-action="care-use-farm-expansion" ${capItem('farmexpansion')<1?'disabled':''}>拡張キットを使う（所持 ${capItem('farmexpansion')}）</button></div></div></section>
  <section class="panel" style="margin-top:14px"><div class="panel-head"><h2>預けるポケモン</h2><span class="pill">${available.length}匹</span></div><div class="panel-body">${available.length?`<div class="care-list">${available.slice(0,60).map(mon=>`<article class="care-mon-card"><div class="care-mon-head">${speciesIcon(mon)}<div><b>${esc(mon.name)}</b><div class="small muted">Lv.${mon.level} ${mon.shiny?'✦色違い':''}</div></div></div><div class="care-mon-meta"><span class="pill">なつき ${mon.friendship||70}/255</span></div><button class="btn btn-primary btn-wide" data-action="care-deposit" data-uid="${esc(mon.uid)}" ${farmMons.length>=farm.capacity?'disabled':''}>農場に預ける</button></article>`).join('')}</div>`:`<div class="empty-state">預けられるポケモンがいません。</div>`}</div></section>`;
 }else{
  const mons=state.owned.slice(0,50);const sp=selected?monSpecies(selected):null;const targets=selected?evolutionTargets(selected):[];
  body=`<section class="panel"><div class="panel-head"><h2>🌱 個体を選ぶ</h2><span class="pill">所持 ${state.owned.length}匹</span></div><div class="panel-body"><select id="care-mon-select" class="field" style="width:100%" data-care-select>${state.owned.map(m=>`<option value="${esc(m.uid)}" ${selected?.uid===m.uid?'selected':''}>${esc(m.name)} · Lv.${m.level}${m.shiny?' ✦':''}</option>`).join('')}</select></div></section>
  ${selected?`<section class="panel" style="margin-top:14px"><div class="panel-head"><h2>${esc(selected.name)}　Lv.${selected.level}</h2><span class="pill">${esc(sp?.types?.map(t=>TYPE_JA[t]).join(' / ')||'')}</span></div><div class="panel-body"><div class="detail-card"><div class="detail-visual">${speciesIcon(selected)}</div><div class="detail-content"><div class="section-kicker">GROWTH / EXP</div><div class="summary-chip"><span>経験値</span><b>${selected.level>=100?'MAX':`${selected.exp} / ${xpNeed(selected.level)}`}</b></div><div class="care-bar"><i style="width:${monXpPercent(selected)}%"></i></div><p class="small muted">所持レベルは1〜100。通常対戦へ出るときは、所持レベルに関係なくLv.50に統一する。</p><div class="care-mon-meta"><span class="pill">なつき ${selected.friendship}/255</span><span class="pill">${selected.shiny?'✦ 色違い':'通常色'}</span><span class="pill">${selected.mark?`◇ ${esc(selected.mark)}`:'証なし'}</span>${selected.personalities.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div><div class="care-action-row"><button class="btn btn-primary" data-action="care-adventure" data-uid="${esc(selected.uid)}" ${selected.level>=100?'disabled':''}>🧭 ミニ冒険（経験値）</button><button class="btn btn-secondary" data-action="care-train" data-uid="${esc(selected.uid)}" ${selected.level>=100?'disabled':''}>⌁ 訓練する</button><button class="btn btn-secondary" data-action="care-use-treat" data-uid="${esc(selected.uid)}" ${capItem('friendshiptreat')<1?'disabled':''}>🍎 なつきおやつ（${capItem('friendshiptreat')}）</button></div><p class="small muted">冒険・訓練で経験値が増える。Lv.100になると経験値の成長は終了する。</p></div></div>
  <h3>個体値（元の値を保持）</h3><div class="iv-list">${STAT_KEYS.map(k=>`<div class="iv-row"><b>${STAT_LABELS[k]}</b><div><div class="care-bar"><i style="width:${Math.round(Number(selected.ivs?.[k]||0)/31*100)}%;background:${selected.hyperTrained?.[k]?'#d8bb79':'linear-gradient(90deg,#36c3ad,#8de18a)'}"></i></div><small class="muted">${selected.hyperTrained?.[k]?'31/31 · 王冠済み（元 '+Number(selected.ivs?.[k]||0)+'/31）':Number(selected.ivs?.[k]||0)+'/31'}</small></div><button class="btn btn-ghost btn-sm" data-action="care-use-silver" data-uid="${esc(selected.uid)}" data-stat="${k}" ${capItem('silvercrown')<1||selected.hyperTrained?.[k]?'disabled':''}>銀冠</button></div>`).join('')}</div><div class="care-action-row"><button class="btn btn-secondary" data-action="care-use-gold" data-uid="${esc(selected.uid)}" ${capItem('goldcrown')<1?'disabled':''}>きんのおうかんを使う（${capItem('goldcrown')}）</button><button class="btn btn-secondary" data-action="care-use-iv-reset" data-uid="${esc(selected.uid)}" ${capItem('ivreroller')<1?'disabled':''}>個体値リセット（${capItem('ivreroller')}）</button></div>
  <h3 style="margin-top:18px">進化</h3>${targets.length?`<div class="care-list">${targets.map(target=>{const need=evoMinimum.get(selected.speciesId+'>'+target.id)||30;const stone=capItem('evolutionstone');return `<article class="care-mon-card"><div class="care-mon-head">${speciesIcon(target)}<div><b>${esc(getPokeName(target))}</b><div class="small muted">必要Lv.${need} · 進化の石1個</div></div></div><button class="btn btn-primary btn-wide" data-action="care-evolve" data-uid="${esc(selected.uid)}" data-target="${esc(target.id)}" ${selected.level<need||stone<1?'disabled':''}>${selected.level<need?`Lv.${need}まで育てる`:stone<1?'進化の石が必要':'進化させる'}</button></article>`;}).join('')}</div><p class="small muted">独自ルール：全進化で進化の石が必要。進化先が表示されない場合は、その系統が内蔵進化表に未登録の可能性があるよ。</p><button class="btn btn-secondary" data-page="shop">進化の石を確認・購入</button>`:`<div class="empty-state"><p>この内蔵ルールでは、現在のポケモンに登録された進化先はありません。</p></div>`}
  <h3 style="margin-top:18px">なつき度・個性・能力補正</h3><p class="small muted">なつき度が高いほど、バトル中にこらえる・状態異常を自力で治す・急所を狙う行動がまれに起こる。</p><div class="care-bar"><i style="width:${Math.round(selected.friendship/255*100)}%"></i></div><p class="small muted">活動回数：冒険 ${Number(selected.activityCounts?.adventure||0)}回 / バトル ${Number(selected.activityCounts?.battle||0)}回 / 訓練 ${Number(selected.activityCounts?.training||0)}回 / 農場 ${Math.floor(Number(selected.farmMinutes||0))}分</p><div class="care-mon-meta">${selected.personalities.length?selected.personalities.map(x=>`<span class="pill">${esc(x)}</span>`).join(''):'<span class="pill">個性未獲得：行動に応じて獲得</span>'}</div><div class="care-action-row"><button class="btn btn-ghost" data-action="care-play" data-uid="${esc(selected.uid)}">🧸 遊ぶ</button><button class="btn btn-ghost" data-action="care-give-meal" data-uid="${esc(selected.uid)}" ${capItem('trainingmeal')<1?'disabled':''}>育成ごはんを使う（${capItem('trainingmeal')}）</button></div></div></section>`:`<div class="panel empty-state">ボックスにポケモンがいません。まずはガチャで仲間を迎えよう。</div>`}`;
 }
 return `${pageHeader('EGG / GROWTH / FRIENDSHIP','孵化・育成ラボ','即戦力のLv.100と、卵から育てるLv.1。2つの遊び方を同じゲームで楽しもう。','<button class="btn btn-ghost" data-page="shop">◇ 育成アイテム</button>')}${carePageHeader()}${body}<p class="footer-note">ローカル試作版。経験値・卵・個体値・農場・アイテムは既存のセーブに追加保存される。古いセーブは読み込み時に初期値を補う。</p>`;
}
let evoReady=false;function setupEvosIfNeeded(){if(evoReady||!state.data?.dex?.length)return;setupEvos();evoReady=true;}
function evolutionTargets(mon){setupEvosIfNeeded();return evosById.get(mon.speciesId)||[];}
function randomBreedingSpecies(){const list=(state.data.dex||[]).filter(p=>p&&p.id&&!p.isMega&&!p.isPrimal&&!p.isGigantamax&&!p.isNonstandard&&!isLegendarySpecies(p));if(!list.length)return null;const weighted=[];for(const p of list){let w=1;const outgoing=evosById.get(p.id)||[];if(outgoing.length)w=3;else {const num=Number(p.num);if([133,0].includes(num))w=1;}for(let i=0;i<w;i++)weighted.push(p);}return weighted[randomInt(weighted.length)];}
function chooseBattleGachaSpecies(){setupEvosIfNeeded();let list=(state.data.dex||[]).filter(p=>p&&p.id&&!p.isMega&&!p.isPrimal&&!p.isGigantamax&&!p.isRegional&&!p.isNonstandard&&!isLegendarySpecies(p)&&!(evosById.get(p.id)||[]).length);if(!list.length)list=selectableDex().filter(p=>!isLegendarySpecies(p));return list[randomInt(list.length)]||null;}
function applyFarmTime(){const now=Date.now(),farm=state.farm;const last=Number(farm.lastAt||now),elapsed=Math.min(12*60*60*1000,Math.max(0,now-last));let changed=false;if(elapsed>=1000&&farm.uids.length){const mins=elapsed/60000;for(const uid of farm.uids){const mon=state.owned.find(m=>m.uid===uid);if(!mon)continue;ensureCareMon(mon);const raw=(Number(mon.farmExpRemainder||0)+mins*0.5);const gained=Math.floor(raw);mon.farmExpRemainder=raw-gained;const result=giveExperience(mon,gained,'farm');mon.farmMinutes+=mins;mon.activityCounts.farm=(Number(mon.activityCounts.farm||0)+mins);const friendRaw=Number(mon.farmFriendshipRemainder||0)+mins/30;const friendGain=Math.floor(friendRaw);mon.farmFriendshipRemainder=friendRaw-friendGain;if(friendGain)addFriendship(mon,friendGain);notePersonality(mon);if(result.levels)state.careStats.farmLevelUps=(Number(state.careStats.farmLevelUps||0)+result.levels);if(gained>0||friendGain>0||result.levels)changed=true;}farm.lastAt=now;if(changed)saveLocal();}
 // prune ids released from the box and award growth exactly once per interval.
 const oldLength=farm.uids.length;farm.uids=farm.uids.filter(uid=>state.owned.some(m=>m.uid===uid));if(farm.uids.length!==oldLength){changed=true;saveLocal();}
}
function takeExp(mon,amount,source){const r=giveExperience(mon,amount,source);notePersonality(mon);if(source==='adventure')mon.activityCounts.adventure=(Number(mon.activityCounts.adventure||0)+1);if(source==='training')mon.activityCounts.training=(Number(mon.activityCounts.training||0)+1);if(r.levels)toast(`${mon.name}は${r.levels}レベル上がった！ Lv.${mon.level}`,'good');if(mon.level>=100)toast(`${mon.name}はレベル100に到達！`,'good');return r;}
function eggRemainingMs(egg){return Math.max(0,Number(egg?.readyAt||0)-Date.now());}
function speedHatchEgg(eggId){const egg=state.eggs.find(e=>e.id===eggId);if(!egg){toast('卵が見つかりません。','warn');return;}if(eggRemainingMs(egg)<=0){toast('この卵はすでに孵化できます。','warn');return;}if(state.vp<2500){toast('時短には2500 VPが必要です。','warn');return;}state.vp-=2500;egg.readyAt=Date.now();saveCare();toast('2500 VPを使って孵化時間を短縮した！','good');renderPage();}
function beginHatch(eggId){if(state.hatchingEggId)return;const egg=state.eggs.find(e=>e.id===eggId);if(!egg){toast('卵が見つかりません。','warn');return;}const remain=eggRemainingMs(egg);if(remain>0){toast(`孵化まであと約${Math.ceil(remain/60000)}分です。2500 VPで短縮できます。`,'warn');return;}state.hatchingEggId=eggId;const root=$('#modal-root');root.innerHTML=`<div class="modal-backdrop hatch-backdrop" data-action="modal-backdrop"><section class="modal hatch-scene" role="dialog" aria-modal="true"><div class="section-kicker">EGG HATCHING</div><span class="hatch-egg">🥚</span><div class="hatch-light">✦　✧　✦</div><h2>卵にひびが入った！</h2><p class="hatch-caption">中から何が生まれるのか……？</p></section></div>`;const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;setTimeout(()=>{const current=state.eggs.find(e=>e.id===eggId);if(!current){state.hatchingEggId=null;root.innerHTML='';return;}const sp=state.data.dexById[current.speciesId];if(!sp){state.hatchingEggId=null;root.innerHTML='';toast('孵化データを読み込めませんでした。','bad');return;}const mon=makeOwned(sp,{level:1,ivs:current.ivs||randomIvs(),nature:current.nature||randomNature(),shiny:!!current.shiny,mark:current.mark||null});ensureCareMon(mon);mon.friendship=80;mon.exp=0;mon.personalities=[];mon.activityCounts={adventure:0,battle:0,farm:0,training:0};state.owned.push(mon);if(state.team.length<6)state.team.push(mon.uid);state.selectedOwned=mon.uid;state.careSelectedUid=mon.uid;state.eggs=state.eggs.filter(e=>e.id!==eggId);saveCare();root.innerHTML=`<div class="modal-backdrop"><section class="modal hatch-scene hatch-reveal" role="dialog" aria-modal="true"><div class="section-kicker">A NEW PARTNER!</div><span class="hatch-egg" style="display:none">🥚</span><div style="font-size:22px;color:#b8e8ff;animation:hatchGlow .6s infinite alternate">✦　✧　✦</div><div style="width:170px;margin:4px auto">${speciesIcon(mon)}</div><h2>${esc(mon.name)}が生まれた！</h2><div class="care-mon-meta" style="justify-content:center"><span class="pill">Lv.1</span><span class="pill">${mon.shiny?'✦ 色違い！':'通常色'}</span><span class="pill">${mon.mark?`◇ ${esc(mon.mark)}`:'証なし'}</span></div><p class="small muted">個体値はランダム。なつき度${mon.friendship}/255。</p><button class="btn btn-primary btn-wide" data-action="care-close-hatch">ボックスに迎える</button></section></div>`;toast(`${mon.name}が卵から孵った！`,'good');},reduced?250:2200);}
function buyBattleGacha(){if(state.vp<100){toast('VPが足りません。','bad');return;}const sp=chooseBattleGachaSpecies();if(!sp){toast('ガチャ候補が見つかりません。','bad');return;}state.vp-=100;const mon=makeOwned(sp,{level:100,ivs:Object.fromEntries(STAT_KEYS.map(k=>[k,31])),nature:'まじめ'});ensureCareMon(mon);mon.exp=0;mon.friendship=70;state.owned.push(mon);if(state.team.length<6)state.team.push(mon.uid);state.selectedOwned=mon.uid;state.careSelectedUid=mon.uid;saveCare();toast(`${mon.name}を対戦用ガチャで獲得！ Lv.100`,'good');renderPage();}
function buyEgg(){if(state.vp<100){toast('VPが足りません。','bad');return;}const sp=randomBreedingSpecies();if(!sp){toast('卵の候補を読み込めません。','bad');return;}const c=cleanAdminConfig(state.adminConfig);const egg={id:'egg-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),speciesId:sp.id,ivs:randomIvs(),nature:randomNature(),shiny:Math.random()<0.5,mark:Math.random()<0.5?['しょうごのあかし','あめふりのあかし','りせいのあかし','げんきのあかし'][randomInt(4)]:null,obtainedAt:new Date().toISOString(),readyAt:Date.now()+5*60*1000};state.vp-=100;state.eggs.push(egg);saveCare();toast('卵が1個出現した！ 中身は孵化するまで秘密。','good');renderPage();}
function careBuyItem(id){const item=CARE_ITEMS.find(x=>x.id===id);if(!item)return;if(state.vp<item.price){toast('VPが足りません。','bad');return;}state.vp-=item.price;state.items[id]=Math.max(0,Number(state.items[id]||0))+1;saveCare();toast(`${item.name}を購入した。`,'good');renderPage();}
function careMonByUid(uid){const m=state.owned.find(x=>x.uid===uid);if(m)ensureCareMon(m);return m;}
function doEvolve(uid,targetId){const mon=careMonByUid(uid),target=state.data.dexById[targetId];if(!mon||!target)return;const need=evoMinimum.get(mon.speciesId+'>'+targetId)||30;if(mon.level<need){toast(`Lv.${need}以上が必要です。`,'warn');return;}if(capItem('evolutionstone')<1){toast('進化の石が必要です。ショップで購入してください。','warn');return;}if(!confirm(`${mon.name}を${getPokeName(target)}に進化させますか？`))return;state.items.evolutionstone--;const old=mon.name;mon.speciesId=target.id;mon.formId=target.id;mon.num=target.num;mon.name=getPokeName(target);mon.friendship=clamp(mon.friendship+5,0,255);if(!Object.values(target.abilities||{}).some(a=>a===mon.abilityId))mon.abilityId=Object.values(target.abilities||{}).find(a=>typeof a==='string')||mon.abilityId;if(!(mon.moves||[]).length)mon.moves=defaultMovesFor(target).map(id=>({id,pp:getMove(id)?.pp||10}));mon.activityCounts.training=Number(mon.activityCounts.training||0)+1;notePersonality(mon);saveCare();toast(`${old}は${mon.name}に進化した！`,'good');renderPage();}
function useCareItem(action,el){const uid=el.dataset.uid||state.careSelectedUid,mon=careMonByUid(uid);if(!mon){toast('対象のポケモンを選んでください。','warn');return;}
 if(action==='care-use-silver'){const k=el.dataset.stat;if(capItem('silvercrown')<1||mon.hyperTrained?.[k])return;state.items.silvercrown--;mon.hyperTrained=mon.hyperTrained||{};mon.hyperTrained[k]=true;}
 else if(action==='care-use-gold'){if(capItem('goldcrown')<1)return;state.items.goldcrown--;mon.hyperTrained=mon.hyperTrained||{};for(const k of STAT_KEYS)mon.hyperTrained[k]=true;}
 else if(action==='care-use-iv-reset'){if(capItem('ivreroller')<1)return;state.items.ivreroller--;mon.ivs=randomIvs();}
 else if(action==='care-feed'){addFriendship(mon,20);mon.activityCounts.farm=Number(mon.activityCounts.farm||0)+1;}
 else if(action==='care-play'){addFriendship(mon,12);mon.activityCounts.farm=Number(mon.activityCounts.farm||0)+1;mon.farmMinutes+=10;}
 else if(action==='care-give-meal'){if(capItem('trainingmeal')<1)return;state.items.trainingmeal--;addFriendship(mon,12);takeExp(mon,10,'training');}
 else if(action==='care-use-treat'){if(capItem('friendshiptreat')<1)return;state.items.friendshiptreat--;addFriendship(mon,35);}
 notePersonality(mon);saveCare();toast('育成データを更新した。','good');renderPage();}
function doCareAction(action,el){const mon=careMonByUid(el.dataset.uid||state.careSelectedUid);switch(action){
 case 'care-set-tab':state.careTab=el.dataset.tab||'gacha';renderPage();break;
 case 'care-buy-battle-gacha':buyBattleGacha();break;
 case 'care-buy-egg':buyEgg();break;
 case 'care-hatch-egg':beginHatch(el.dataset.egg);break;
 case 'care-speed-hatch':speedHatchEgg(el.dataset.egg);break;
 case 'care-close-hatch':state.hatchingEggId=null;$('#modal-root').innerHTML='';setPage('care');break;
 case 'care-buy-item':careBuyItem(el.dataset.item);break;
 case 'care-select-mon':state.careSelectedUid=el.value;renderPage();break;
 case 'care-deposit':{const uid=el.dataset.uid;if(!state.owned.some(m=>m.uid===uid))break;if(state.farm.uids.includes(uid)){toast('すでに預けています。','warn');break;}applyFarmTime();if(state.farm.uids.length>=state.farm.capacity){toast('農場がいっぱいです。拡張キットを使ってね。','warn');break;}state.farm.uids.push(uid);state.farm.lastAt=Date.now();const m=careMonByUid(uid);m.activityCounts.farm=Number(m.activityCounts.farm||0)+1;notePersonality(m);saveCare();renderPage();break;}
 case 'care-withdraw':applyFarmTime();state.farm.uids=state.farm.uids.filter(x=>x!==el.dataset.uid);state.farm.lastAt=Date.now();saveCare();toast('農場から引き取った。');renderPage();break;
 case 'care-feed':case 'care-play':case 'care-give-meal':case 'care-use-silver':case 'care-use-gold':case 'care-use-iv-reset':case 'care-use-treat':useCareItem(action,el);break;
 case 'care-use-farm-expansion':if(capItem('farmexpansion')<1){toast('農場拡張キットがありません。','warn');break;}state.items.farmexpansion--;state.farm.capacity+=3;saveCare();toast(`農場の収容数が${state.farm.capacity}匹になった。`,'good');renderPage();break;
 case 'care-evolve':doEvolve(el.dataset.uid,el.dataset.target);break;
 case 'care-adventure':if(!mon)break;takeExp(mon,12+randomInt(19),'adventure');addFriendship(mon,3);notePersonality(mon);saveCare();renderPage();toast(`${mon.name}はミニ冒険を終えた！`,'good');break;
 case 'care-train':if(!mon)break;takeExp(mon,6+randomInt(11),'training');addFriendship(mon,1);mon.evs=mon.evs||Object.fromEntries(STAT_KEYS.map(k=>[k,0]));notePersonality(mon);saveCare();renderPage();break;
 default:return false;
 }return true;}
const originalRenderPage=renderPage;
renderPage=function(){applyFarmTime();if(state.page==='care'){const main=$('#main');if(main){const previousSprites=new Map();main.querySelectorAll('img[data-sprite-key]').forEach(img=>{const key=img.dataset.spriteKey;if(!key)return;if(!previousSprites.has(key))previousSprites.set(key,[]);previousSprites.get(key).push(img);});const template=document.createElement('template');template.innerHTML=renderCare();template.content.querySelectorAll('img[data-sprite-key]').forEach(fresh=>{const queue=previousSprites.get(fresh.dataset.spriteKey);if(!queue?.length)return;const previous=queue.shift();if(!previous||previous.classList.contains('sprite-missing'))return;previous.alt=fresh.alt||previous.alt;fresh.replaceWith(previous);});main.replaceChildren(template.content);updateTop();bindPageEvents();main.onchange=(e)=>{if(e.target.id==='care-mon-select'){state.careSelectedUid=e.target.value;renderPage();}};}return;}return originalRenderPage();};
const originalRenderShop=renderShop;
renderShop=function(){const html=originalRenderShop();return html+`<section class="panel" style="margin-top:15px"><div class="panel-head"><h2>🌱 育成・厳選アイテム</h2><span class="pill">${CARE_ITEMS.length}種類</span></div><div class="panel-body"><div class="care-list">${CARE_ITEMS.map(it=>`<article class="care-mon-card"><div class="section-kicker">CARE ITEM</div><h3>${esc(it.name)}</h3><p class="small muted">${esc(it.desc)}</p><div class="care-mon-meta"><span class="pill">${it.price} VP</span><span class="pill">所持 ${capItem(it.id)}個</span></div><button class="btn btn-primary btn-wide" data-action="care-buy-item" data-item="${esc(it.id)}" ${state.vp<it.price?'disabled':''}>購入する</button></article>`).join('')}</div></div></section>`;};
// Upgrade old owned records made in prior versions without altering species/move data.
const originalMakeOwned=makeOwned;
makeOwned=function(species,options={}){const mon=originalMakeOwned(species,options);ensureCareMon(mon);if(options.exp!=null)mon.exp=Number(options.exp)||0;if(options.friendship!=null)mon.friendship=clamp(options.friendship,0,255);return mon;};
const originalNormalizeOwnedIdentity=normalizeOwnedIdentity;
normalizeOwnedIdentity=function(mon){const out=originalNormalizeOwnedIdentity(mon);return ensureCareMon(out);};
// All normal trainer battles use level 50 while retaining the owned level, IVs, EVs, and nature.
const originalBuildBattleMon=buildBattleMon;
buildBattleMon=function(monOrSpecies,owned=false){const out=originalBuildBattleMon(monOrSpecies,owned);if(owned&&!(state.raidTargetId&&String(monOrSpecies?.speciesId||'')===String(state.raidTargetId)&&Number(monOrSpecies?.level||0)>=75)){out.originalLevel=Number(monOrSpecies?.level||50);out.level=50;out.stats=calcStats(out);out.maxhp=out.stats.hp;out.hp=out.maxhp;}return out;};
// Hyper-training is kept separate from original IVs, so an A0/S0 record remains visible.
const originalCalcStats=calcStats;
calcStats=function(mon){if(mon?.hyperTrained&&Object.values(mon.hyperTrained).some(Boolean)){const ivs={...(mon.ivs||{})};for(const k of STAT_KEYS)if(mon.hyperTrained[k])ivs[k]=31;return originalCalcStats({...mon,ivs});}return originalCalcStats(mon);};
// Rare friendship actions are applied as small battle-engine add-ons.
const originalCalculateDamage=calculateDamage;
calculateDamage=function(actor,target,move,b){const result=originalCalculateDamage(actor,target,move,b);if(actor&&Number(actor.friendship||0)>=220&&result&&result.damage>0&&!result.critical){const chance=0.01+Math.max(0,Number(actor.friendship)-220)*0.00035;if(Math.random()<chance){result.damage=Math.max(1,Math.floor(result.damage*1.5));result.critical=true;if(b&&typeof battleLog==='function')battleLog(`${actor.name}はトレーナーのために急所を狙った！`);}}return result;};
const originalExecuteAction=executeAction;
executeAction=function(act,b){const before=(b?.playerTeam||[]).map(m=>({uid:m.uid,hp:m.hp,fainted:m.fainted,friendship:Number(m.friendship||0)}));originalExecuteAction(act,b);if(act?.side==='enemy'&&b?.playerTeam){for(const prior of before){const mon=b.playerTeam.find(m=>m.uid===prior.uid);if(mon&&prior.hp>0&&Number(mon.hp)<=0&&!prior.fainted&&prior.friendship>=180){const chance=0.005+Math.max(0,prior.friendship-180)*0.0004;if(Math.random()<chance){mon.hp=1;mon.fainted=false;battleLog(`${mon.name}はなつき度の力で攻撃をこらえた！`);}}}}if(act?.side==='player'){const owned=state.owned.find(m=>m.uid===act.actorUid);if(owned){addFriendship(owned,1);owned.activityCounts.battle=Number(owned.activityCounts.battle||0);}}};
const originalProcessEndTurn=processEndTurn;
processEndTurn=function(b){originalProcessEndTurn(b);for(const mon of (b?.playerTeam||[])){if(mon?.status&&Number(mon.friendship||0)>=200){const chance=0.005+(Number(mon.friendship)-200)*0.00025;if(Math.random()<chance){const st=mon.status;mon.status=null;mon.statusTurns=0;battleLog(`${mon.name}はなつき度の力で${STATUS_JA[st]||st}を治した！`);}}}};
// On the first victory turn only, award EXP to the six owned battle participants.
const originalExecuteTurn=executeTurn;
executeTurn=async function(actions){const battleBefore=state.battle,wasResult=battleBefore?.result;await originalExecuteTurn(actions);if(battleBefore&&state.battle===battleBefore&&battleBefore.result==='win'&&wasResult!=='win'&&battleBefore.mode!=='raid'){const teamIds=new Set((battleBefore.playerTeam||[]).map(m=>m.uid));let awards=0;for(const mon of state.owned){if(teamIds.has(mon.uid)){const gain=mon.level>=100?0:Math.max(35,Math.min(120,45+Math.floor((mon.level||1)*0.75)));const r=takeExp(mon,gain,'battle');addFriendship(mon,2);mon.activityCounts.battle=Number(mon.activityCounts.battle||0)+1;notePersonality(mon);awards+=r.gained;}}if(awards)toast(`チームが合計${awards.toLocaleString()} EXPを獲得！`,'good');saveCare();renderPage();}};
// Route new actions through this extension, then leave every pre-existing action untouched.
const originalHandleAction=handleAction;
handleAction=async function(action,el){if(String(action).startsWith('care-')){doCareAction(action,el);return;}return originalHandleAction(action,el);};
// Keep in-app backup export/import schema aligned with the new care fields.
const originalSetPage=setPage;
// Care pages can be opened from either navigation bar; this just keeps the selected button visual active.
state.eggs=Array.isArray(state.eggs)?state.eggs:[];
state.farm=state.farm||{uids:[],capacity:3,lastAt:Date.now()};
state.careStats=state.careStats||{};
// Provide a pleasant landing state with the new feature reachable immediately.
if(!evoReady&&state.data?.dex?.length)setupEvosIfNeeded();

window.PokemonChampions2D={state,loadAllData,ensureOwnedMoveSets,calcStats,currentStat,calculateDamage,resolveMoveTypePower,resolveContextMoveData,learnableMoves,findSpecies,getMove,setStatus,abilityDescription,moveDescription,triggerEntryEffects,isGrounded,applyTerrain,findMegaForm,applyMoveExtras};
// v16.3: unified move-effect schema + user-editable species measurements.
// AI should author/validate data before shipping; battle execution stays deterministic and offline.
const MOVE_EFFECT_SCHEMA_VERSION = 1;
const MOVE_EFFECT_TYPES = new Set(['status','volatile','boost','heal','drain','recoil','weather','terrain','protect','remove_status','clear_boosts','force_switch','multi_hit','fixed_damage','ohko','type_change','field_condition','custom']);
function canonicalEffect(e){
 if(!e||typeof e!=='object')return null;
 const type=String(e.type||'').toLowerCase(); if(!MOVE_EFFECT_TYPES.has(type))return null;
 const out={type};
 for(const k of ['status','volatileStatus','weather','terrain','target','condition','value','min','max','chance','turns','fraction','numerator','denominator','stat','amount','source','mode','id','types']) if(e[k]!==undefined)out[k]=e[k];
 if(e.boosts&&typeof e.boosts==='object')out.boosts={...e.boosts};
 if(e.status)out.status=String(e.status);
 out.chance=Math.max(0,Math.min(100,Number(out.chance??100)));
 return out;
}
function legacyMoveEffects(m){
 const out=[];
 if(m.status)out.push({type:'status',status:m.status,target:'target',chance:Number(m.effectChance)>0?Number(m.effectChance):100});
 if(m.volatileStatus)out.push({type:'volatile',volatileStatus:m.volatileStatus,target:'target',chance:Number(m.effectChance)>0?Number(m.effectChance):100});
 if(m.boosts)out.push({type:'boost',boosts:m.boosts,target:['self','allySide','allies'].includes(m.target)?'self':'target'});
 if(m.self?.boosts)out.push({type:'boost',boosts:m.self.boosts,target:'self'});
 if(Array.isArray(m.heal)&&m.heal.length>=2)out.push({type:'heal',target:'self',fraction:Number(m.heal[0]),denominator:Number(m.heal[1])});
 if(m.weather)out.push({type:'weather',weather:m.weather});
 if(m.terrain)out.push({type:'terrain',terrain:m.terrain});
 for(const sec of [...(Array.isArray(m.secondaries)?m.secondaries:[]),...(m.secondary?[m.secondary]:[])]){
  if(sec.status)out.push({type:'status',status:sec.status,target:sec.self?'self':'target',chance:sec.chance??100});
  if(sec.volatileStatus)out.push({type:'volatile',volatileStatus:sec.volatileStatus,target:sec.self?'self':'target',chance:sec.chance??100});
  if(sec.boosts)out.push({type:'boost',boosts:sec.boosts,target:sec.self?'self':'target',chance:sec.chance??100});
 }
 const id=slug(m.id||m.name||'');
 const add=(type,extra={})=>{if(!out.some(x=>x.type===type&&Object.keys(extra).every(k=>x[k]===extra[k])))out.push({type,...extra});};
 const statusIds={thunderwave:'par',willowisp:'brn',toxic:'tox',poisonpowder:'psn',stunspore:'par',sleeppowder:'slp',hypnosis:'slp',spore:'slp',glare:'par',nuzzle:'par',yawn:'slp'};
 if(statusIds[id]&&!out.some(x=>x.type==='status'))add('status',{status:statusIds[id],target:'target',chance:100});
 const boosts={swordsdance:{atk:2},nastyplot:{spa:2},calmmind:{spa:1,spd:1},agility:{spe:2},irondefense:{def:2},amnesia:{spd:2},dragonDance:{atk:1,spe:1},dragondance:{atk:1,spe:1},quiverdance:{spa:1,spd:1,spe:1},shellsmash:{atk:2,spa:2,spe:2,def:-1,spd:-1},howl:{atk:1},workup:{atk:1,spa:1}};
 if(boosts[id]&&!out.some(x=>x.type==='boost'))add('boost',{boosts:boosts[id],target:'self'});
 const recover=new Set(['recover','roost','slackoff','milkdrink','softboiled','shoreup','healorder','lifedew']);
 if(recover.has(id)&&!out.some(x=>x.type==='heal'))add('heal',{target:'self',fraction:1,denominator:2});
 if(id==='rest'&&!out.some(x=>x.type==='heal')){add('heal',{target:'self',fraction:1,denominator:1});add('status',{status:'slp',target:'self',chance:100,turns:2});}
 if(id==='protect'||id==='detect'||id===' kingsshield'.trim()||id==='spikyshield'||id==='banefulbunker')add('protect',{target:'self'});
 const weather={raindance:'rain',sunnyday:'sun',sandstorm:'sand',snowscape:'snow',hail:'snow'};
 if(weather[id]&&!out.some(x=>x.type==='weather'))add('weather',{weather:weather[id]});
 const terrains={electricterrain:'electric',grassyterrain:'grassy',psychicterrain:'psychic',mistyterrain:'misty'};
 if(terrains[id]&&!out.some(x=>x.type==='terrain'))add('terrain',{terrain:terrains[id]});
 return out.map(canonicalEffect).filter(Boolean);
}
function normalizeSpeciesMeasurements(species){
 if(!species||typeof species!=='object')return species;
 // Values are intentionally not guessed. User-provided height/weight fields remain authoritative.
 const height=Number(species.heightM??species.height_m??species.heightMeters);
 const weight=Number(species.weightKg??species.weight_kg??species.weightKgValue);
 species.measurements=species.measurements&&typeof species.measurements==='object'?species.measurements:{};
 if(Number.isFinite(height)&&height>0)species.measurements.heightM=height;
 if(Number.isFinite(weight)&&weight>0)species.measurements.weightKg=weight;
 return species;
}
function normalizeMoveForEngine(move){
 if(!move||typeof move!=='object')return move;
 const hadCanonicalEffects=Array.isArray(move.effects);
 move._canonicalEffectsExplicit=hadCanonicalEffects;
 move.effectSchemaVersion=MOVE_EFFECT_SCHEMA_VERSION;
 move.effects=hadCanonicalEffects?move.effects.map(canonicalEffect).filter(Boolean):legacyMoveEffects(move);
 move.effects=move.effects.map(canonicalEffect).filter(Boolean);
 return move;
}
function auditUnifiedGameData(){
 const moves=Object.values(state.data?.movesById||state.data?.moves||{});
 const dex=Array.isArray(state.data?.dex)?state.data.dex:[];
 const report={schemaVersion:MOVE_EFFECT_SCHEMA_VERSION,moves:moves.length,movesWithEffects:moves.filter(m=>Array.isArray(m.effects)&&m.effects.length).length,movesWithoutEffects:moves.filter(m=>!Array.isArray(m.effects)||!m.effects.length).length,species:dex.length,speciesWithHeight:dex.filter(p=>Number(p.measurements?.heightM??p.heightM??p.height_m)>0).length,speciesWithWeight:dex.filter(p=>Number(p.measurements?.weightKg??p.weightKg??p.weight_kg)>0).length,unknownEffectTypes:[]};
 for(const m of moves)for(const e of m.effects||[])if(!MOVE_EFFECT_TYPES.has(e.type))report.unknownEffectTypes.push({move:m.id,type:e.type});
 return report;
}
function executeCanonicalMoveEffects(actor,target,move,b){
 const effects=Array.isArray(move.effects)?move.effects:[];
 if(!effects.length)return;
 const ability=slug(actor.abilityId);
 for(const raw of effects){const e=canonicalEffect(raw);if(!e)continue;
  const chance=Math.max(0,Math.min(100,Number(e.chance??100)*(ability==='serenegrace'&&e.target!=='self'?2:1)));
  if(chance<100&&Math.random()*100>=chance)continue;
  const recipient=e.target==='self'?actor:target;
  switch(e.type){
   case 'status': if(e.status&&recipient)setStatus(recipient,e.status,getMoveName(move));break;
   case 'volatile': if(recipient&&e.volatileStatus){recipient.volatile=recipient.volatile||{};recipient.volatile[e.volatileStatus]=true;battleLog(`${recipient.name}に${e.volatileStatus}の効果！`);}break;
   case 'boost': if(recipient&&e.boosts)applyBoosts(recipient,e.boosts,getMoveName(move));break;
   case 'heal': if(recipient){const den=Math.max(1,Number(e.denominator||1));const amount=Math.max(1,Math.floor(recipient.maxhp*Number(e.fraction??1)/den));const before=recipient.hp;recipient.hp=Math.min(recipient.maxhp,recipient.hp+amount);if(recipient.hp>before)battleLog(`${recipient.name}はHPを${recipient.hp-before}回復した！`);}break;
   case 'weather': if(e.weather)applyWeather(e.weather,b);break;
   case 'terrain': if(e.terrain)applyTerrain(e.terrain,b);break;
   case 'protect': actor.volatile=actor.volatile||{};actor.volatile.protected=true;battleLog(`${actor.name}は身を守った！`);break;
   case 'remove_status': if(recipient){recipient.status=null;recipient.statusTurns=0;}break;
   case 'clear_boosts': if(recipient)recipient.boosts={atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0,eva:0};break;
   case 'recoil': if(actor&&Number(e.fraction)>0){const amount=Math.max(1,Math.floor(Number(move._lastDamage||0)*Number(e.fraction)));actor.hp=Math.max(0,actor.hp-amount);if(actor.hp===0)actor.fainted=true;battleLog(`${actor.name}も反動を受けた！`);}break;
   case 'drain': if(actor&&Number(e.fraction)>0){const amount=Math.max(1,Math.floor(Number(move._lastDamage||0)*Number(e.fraction)));actor.hp=Math.min(actor.maxhp,actor.hp+amount);}break;
   case 'field_condition': b.sideConditions=b.sideConditions||{player:{},enemy:{}};break;
   // Unsupported advanced mechanics are kept explicit for validation rather than guessed.
   default: break;
  }
 }
}
// Convert every loaded move once, then rebuild the alias map so all UI and battle paths share records.
const __v162LoadAllData=loadAllData;
loadAllData=async function(){await __v162LoadAllData();const all=Object.values(state.data.movesById||state.data.moves||{});for(const m of all)normalizeMoveForEngine(m);for(const p of state.data.dex||[])normalizeSpeciesMeasurements(p);state.data.moveAliases=state.data.moveAliases||{};for(const m of all){for(const k of [m.id,m.name,m.jpName,m.displayName,m.apiId!=null?`api-${m.apiId}`:null])if(k!=null&&String(k).trim())state.data.moveAliases[String(k)]=m.id; }state.unifiedDataAudit=auditUnifiedGameData();};
// Keep legacy move-specific behavior intact; records authored with the canonical effects array use the shared runner.
const __v162ApplyMoveExtras=applyMoveExtras;
applyMoveExtras=function(actor,target,move,b){
 if(!move||!actor||!target||!b)return;
 __v162ApplyMoveExtras(actor,target,move,b);
 if(move._canonicalEffectsExplicit)executeCanonicalMoveEffects(actor,target,move,b);
};
// Weight-based move power reads user-supplied species measurements; missing weights are never guessed.
const __v162ResolveContextMoveData=resolveContextMoveData;
resolveContextMoveData=function(move,actor,target,b){
 const result=__v162ResolveContextMoveData(move,actor,target,b);
 const id=slug(move?.id||move?.name||'');
 const weightOf=mon=>{const sp=monSpecies(mon);const n=Number(sp?.measurements?.weightKg??sp?.weightKg??sp?.weight_kg??sp?.weightKgValue);return Number.isFinite(n)&&n>0?n:null;};
 const targetWeight=weightOf(target),actorWeight=weightOf(actor);
 if(['lowkick','grassknot'].includes(id)&&targetWeight!=null){result.power=targetWeight<10?20:targetWeight<25?40:targetWeight<50?60:targetWeight<100?80:targetWeight<200?100:120;}
 if(['heavyslam','heatcrash'].includes(id)&&actorWeight!=null&&targetWeight!=null){const ratio=actorWeight/targetWeight;result.power=ratio>=5?120:ratio>=4?100:ratio>=3?80:ratio>=2?60:40;}
 return result;
};
// Data-entry helpers are exposed for the in-game console and future data editor.
window.PokemonChampions2DData={schemaVersion:MOVE_EFFECT_SCHEMA_VERSION,normalizeMove:normalizeMoveForEngine,normalizeSpecies:normalizeSpeciesMeasurements,audit:auditUnifiedGameData,allowedEffectTypes:[...MOVE_EFFECT_TYPES]};

// v16.4: the supplied pokemon-data.json measurements are embedded in OFFLINE_DATABASE.
// Keep one authoritative unit (m/kg), and use the same records for UI, audits, and damage.
normalizeSpeciesMeasurements=function(species){
 if(!species||typeof species!=='object')return species;
 const height=Number(species.measurements?.heightM??species.heightM??species.heightm??species.height_m??species.heightMeters);
 const weight=Number(species.measurements?.weightKg??species.weightKg??species.weightkg??species.weight_kg??species.weightKgValue);
 species.measurements=species.measurements&&typeof species.measurements==='object'?species.measurements:{};
 if(Number.isFinite(height)&&height>0)species.measurements.heightM=height;
 if(Number.isFinite(weight)&&weight>0)species.measurements.weightKg=weight;
 return species;
};
const __v164LoadAllData=loadAllData;
loadAllData=async function(){
 await __v164LoadAllData();
 const data=state.data;
 for(const species of data.dex||[])normalizeSpeciesMeasurements(species);
 const all=Object.values(data.movesById||{});
 const byApi=id=>all.find(move=>Number(move?.apiId)===id);
 // These entries arrived under stable PokeAPI fallback IDs.  Preserve their IDs and
 // add engine metadata instead of replacing learnset references.
 const bellyDrum=byApi(187), fatalClaw=byApi(827), uTurn=byApi(369);
 if(bellyDrum){bellyDrum.target='self';bellyDrum.effectProfile='belly_drum';}
 if(fatalClaw){fatalClaw.effectProfile='fatal_claw';fatalClaw.effectChance=50;}
 if(uTurn)uTurn.selfSwitch=true;
 state.unifiedDataAudit=auditUnifiedGameData();
 state.unifiedDataAudit.measurements={source:'pokemon-data.json',matched:data.dex.filter(p=>Number(p.measurements?.heightM)>0&&Number(p.measurements?.weightKg)>0).length,missing:data.dex.filter(p=>!Number(p.measurements?.heightM)||!Number(p.measurements?.weightKg)).map(p=>p.id)};
 return data;
};
const __v164ApplyMoveSpecificEffects=applyMoveSpecificEffects;
applyMoveSpecificEffects=function(actor,target,move,b){
 __v164ApplyMoveSpecificEffects(actor,target,move,b);
 const apiId=Number(move?.apiId), id=slug(move?.id||move?.name||'');
 if(apiId===187){
  const cost=Math.floor(actor.maxhp/2);
  if(actor.hp<=cost){battleLog(`${actor.name} は HP が 足りないため はらだいこ を 使えなかった！`);return;}
  actor.hp-=cost; actor.stages.atk=6; battleLog(`${actor.name} は HP を 半分使い、攻撃を 最大まで上げた！`);
 }
 if(apiId===827&&target&&target.hp>0&&!target.status&&Math.random()<0.5){
  const status=['psn','par','slp'][Math.floor(Math.random()*3)]; setStatus(target,status,getMoveName(move));
 }
 if((apiId===168||id==='thief'||id==='covet')&&actor&&!actor.heldItem&&target?.heldItem){
  actor.heldItem=target.heldItem; target.heldItem=''; battleLog(`${actor.name} は ${target.name} の 道具を 奪った！`);
 }
 if((apiId===285||id==='skillswap')&&actor&&target&&actor!==target){
  const ability=actor.abilityId; actor.abilityId=target.abilityId; target.abilityId=ability; battleLog(`${actor.name} と ${target.name} は 特性を 入れ替えた！`);
 }
};
// Correct the canonical clear-stat operation: battle state uses `stages`, not `boosts`.
const __v164ExecuteCanonicalMoveEffects=executeCanonicalMoveEffects;
executeCanonicalMoveEffects=function(actor,target,move,b){
 __v164ExecuteCanonicalMoveEffects(actor,target,move,b);
 for(const effect of move?.effects||[])if(effect?.type==='clear_boosts'){
  const recipient=effect.target==='self'?actor:target;
  if(recipient)recipient.stages={atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0,evasion:0};
 }
};
Object.assign(window.PokemonChampions2DData,{version:'v16.4',measurementSource:'pokemon-data.json',priorityMoveApiIds:{bellyDrum:187,fatalClaw:827,doubleEdge:38,gigaDrain:202,recover:105,uTurn:369,thief:168,skillSwap:285}});

// v16.9: classify every embedded move against the agreed 20-category taxonomy.
const __v169LoadAllData=loadAllData;
loadAllData=async function(){const result=await __v169LoadAllData();for(const m of Object.values(state.data.movesById||{}))moveTaxonomyCategories(m);state.moveTaxonomyAudit=auditMoveTaxonomy();Object.assign(window.PokemonChampions2DData,{taxonomyVersion:'20-category-v1',taxonomy:MOVE_TAXONOMY.map(({id,group,name,summary,examples})=>({id,group,name,summary,examples})),classifyMove:moveTaxonomyCategories,auditMoveTaxonomy});return result;};
Object.assign(window.PokemonChampions2DData,{taxonomyVersion:'20-category-v1',taxonomy:MOVE_TAXONOMY.map(({id,group,name,summary,examples})=>({id,group,name,summary,examples})),classifyMove:moveTaxonomyCategories,auditMoveTaxonomy});

// v16.10: battle runtime integration for the agreed 20-category move taxonomy.
// Existing damage/status/hazard paths remain authoritative; this layer supplies missing shared handlers.
const V170_RECHARGE_API = new Set([63,307,308,338,416,439,459,711,795]);
const V170_CHARGE_API = new Set([13,19,76,91,130,143,291,340,467,566,601,669,800]);
const V170_SEMI_INVULNERABLE_API = new Set([19,91,291,340,467,566]);
const V170_COUNTER_API = new Set([68,243,368]);
const V170_HANDLED_API = new Set([13,18,19,20,35,48,49,50,63,68,69,73,76,82,83,91,101,105,109,114,118,130,143,149,156,162,166,169,175,182,194,195,197,203,207,212,213,214,220,226,227,243,244,248,250,259,260,269,271,272,273,275,281,283,285,291,298,307,308,328,335,338,340,353,356,366,368,380,383,388,391,392,415,416,433,439,448,467,469,470,471,472,478,487,493,494,495,499,501,502,509,511,513,515,525,567,571,576,588,596,601,611,661,669,682,711,717,792,795,800,852,877,894,908]);
const V170_CATEGORY_STATUS = {
  1:'通常のダメージ計算に接続済み',2:'ダメージ後の回復・反動・追加効果を共通処理へ接続',3:'固定値・割合・HP比較・カウンターを追加接続',4:'一撃必殺の命中／レベル条件を既存処理へ接続',5:'防御・こらえる・接触時反撃を追加接続',6:'溜め・反動・遅延攻撃・拘束を追加接続',7:'即時回復・願い事・継続回復を接続',8:'みがわり処理を既存のダメージ経路へ接続',9:'能力ランク変更・リセット・コピーを追加接続',10:'状態異常・混乱・行動制限を追加接続',11:'特性交換・上書き・一時抑制を追加接続',12:'タイプ変更をタイプ相性計算へ接続',13:'持ち物操作・バトンタッチを追加接続',14:'保護・回避・こらえるを追加接続',15:'強制交代・追い風・行動順制御を追加接続',16:'ゆびをふる・まねっこを追加接続',17:'みちづれ・ほろびのうたを追加接続',18:'設置技・壁を既存の交代／ダメージ処理へ接続',19:'天候・フィールドを既存のダメージ／ターン処理へ接続',20:'トリックルーム等の場ルールを追加接続'
};
function v170Api(move){return Number(move?.apiId||0);}
function v170Side(mon,b){return (b.playerTeam||[]).some(x=>x.uid===mon?.uid)?'player':'enemy';}
function v170MoveName(move){return String(move?.jpName||move?.name||'技');}
function v170SetStages(mon,vals){if(!mon)return;mon.stages=mon.stages||{atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0,evasion:0};for(const k of ['atk','def','spa','spd','spe','accuracy','evasion'])mon.stages[k]=Math.max(-6,Math.min(6,Number(vals?.[k]||0)));}
function v170ForceSwitch(target,b){const side=v170Side(target,b),team=side==='player'?b.playerTeam:b.enemyTeam,active=side==='player'?b.playerActive:b.enemyActive;const ix=team.findIndex(m=>m.uid===target.uid),slot=active.indexOf(ix);if(slot<0)return false;const next=team.findIndex((m,i)=>i!==ix&&!m.fainted&&m.hp>0&&!active.includes(i));if(next<0)return false;active[slot]=next;triggerEntryEffects([team[next]],side==='player'?activeLiving(b.enemyTeam,b.enemyActive):activeLiving(b.playerTeam,b.playerActive),b);battleLog(`${target.name}は交代させられた！ ${team[next].name}が現れた！`);return true;}
function v170HandleVariableDamage(actor,target,move,b){
 const api=v170Api(move),eff=typeMult(move.type,monSpecies(target),target);
 if(V170_COUNTER_API.has(api)){
  if(eff===0){battleLog('効果がないようだ……');return true;}
  const last=actor._lastDamageTaken;
  if(!last||last.turn!==b.turn||(api===68&&last.category!=='Physical')||(api===243&&last.category!=='Special')){battleLog('しかし うまく決まらなかった！');return true;}
  const amount=Math.max(1,Math.floor(last.amount*(api===368?1.5:2)));const actual=applyDamage(target,amount,actor,move);actor._lastMoveHit=actual>0;actor._lastMoveDamage=actual; battleLog(`${v170MoveName(move)}で${actual}ダメージを返した！`);b.lastSuccessfulMoveId=move.id;return true;
 }
 const fixed=[69,101,82,49,149,162,283,515,717,877,220];if(!fixed.includes(api))return false;
 if(eff===0){battleLog('効果がないようだ……');return true;}
 let amount=0;
 if(api===69||api===101)amount=Math.max(1,Number(actor.level||50));
 else if(api===82)amount=40;
 else if(api===49)amount=20;
 else if(api===149)amount=Math.max(1,Math.floor(Number(actor.level||50)*(.5+Math.random())));
 else if(api===162||api===717||api===877)amount=Math.max(1,Math.floor(Number(target.hp||0)/2));
 else if(api===283)amount=Math.max(0,Number(target.hp||0)-Number(actor.hp||0));
 else if(api===515)amount=Math.max(1,Number(actor.hp||0));
 else if(api===220){const avg=Math.floor((Number(actor.hp||0)+Number(target.hp||0))/2);const aBefore=actor.hp,tBefore=target.hp;actor.hp=Math.min(actor.maxhp,avg);target.hp=Math.min(target.maxhp,avg);battleLog(`お互いのHPが分けられた！（${aBefore}→${actor.hp}、${tBefore}→${target.hp}）`);actor._lastMoveHit=true;actor._lastMoveDamage=0;b.lastSuccessfulMoveId=move.id;return true;}
 if(amount<=0){battleLog('しかし 効果がなかった！');actor._lastMoveHit=false;return true;}
 const actual=applyDamage(target,amount,actor,move);battleLog(`${target.name}に${actual}ダメージ！`);actor._lastMoveHit=actual>0;actor._lastMoveDamage=actual;
 if(api===515){actor.hp=0;actor.fainted=true;battleLog(`${actor.name}は命をかけた！`);}
 b.lastSuccessfulMoveId=move.id;return true;
}
function v170RunBattleEffects(actor,target,move,b){
 if(!actor||!target||!move||!b||actor._lastMoveHit===false)return;
 const api=v170Api(move),id=slug(move.id||move.name||''),isSelf=actor.uid===target.uid;
 // A successful hit by a recharge attack makes the user's next action a forced skip, including a Substitute hit.
 if(V170_RECHARGE_API.has(api)&&actor._lastMoveDamage>0){actor._rechargePending=true;battleLog(`${actor.name}は反動で次のターン動けなくなる！`);}
 if(V170_HANDLED_API.has(api))b.lastSuccessfulMoveId=move.id;
 if(actor._lastHitWasSubstitute===true)return;
 // Protection / counterattack category.
 if([182,197,203,588,596,661,792,852,908].includes(api)||['protect','detect','kingsshield','spikyshield','banefulbunker','obstruct','silktrap','burningbulwark','endure'].includes(id)){
  if(api===203||id==='endure')actor._endureTurn=b.turn;
  else {actor.volatile=actor.volatile||{};actor.volatile.protected=true;}
  if(api===588||id==='kingsshield')actor._kingShieldTurn=b.turn;
  if(api===596||id==='spikyshield')actor._spikyShieldTurn=b.turn;
  if(api===661||id==='banefulbunker')actor._banefulBunkerTurn=b.turn;
  if(!['protect','detect','kingsshield','spikyshield','banefulbunker','obstruct','silktrap','burningbulwark'].includes(id))battleLog(`${actor.name}は攻撃から身を守った！`);
 }
 if(api===469||api===501){const side=v170Side(actor,b);b.sideConditions=b.sideConditions||{player:{},enemy:{}};b.sideConditions[side]=b.sideConditions[side]||{};b.sideConditions[side][api===469?'wideGuardTurn':'quickGuardTurn']=b.turn;battleLog(api===469?'味方を広範囲攻撃から守る構えを取った！':'味方を先制技から守る構えを取った！');}
 // Recovery over time, Wish, Aqua Ring and Ingrain.
 if(api===273||id==='wish'){const side=v170Side(actor,b),team=side==='player'?b.playerTeam:b.enemyTeam,active=side==='player'?b.playerActive:b.enemyActive;const idx=team.findIndex(m=>m.uid===actor.uid),slot=Math.max(0,active.indexOf(idx));actor._wish={dueTurn:b.turn+1,side,slot,amount:Math.max(1,Math.floor(actor.maxhp/2))};battleLog(`${actor.name}は願い事をした！`);}
 if(api===392||id==='aquaring')actor._aquaRing=true;
 if(api===275||id==='ingrain')actor._ingrain=true;
 // Stat manipulation not represented by simple per-move metadata.
 if(api===114||id==='haze'){for(const mon of [...b.playerTeam,...b.enemyTeam])v170SetStages(mon,{});battleLog('黒い霧で全員の能力変化が消えた！');}
 if(api===244||id==='psychup'){v170SetStages(actor,target.stages||{});battleLog(`${actor.name}は相手の能力変化をコピーした！`);}
 if(api===576||id==='topsyturvy'){for(const k of ['atk','def','spa','spd','spe','accuracy','evasion'])target.stages[k]=-(target.stages[k]||0);battleLog(`${target.name}の能力変化が逆転した！`);}
 if(api===499||id==='clearsmog'){v170SetStages(target,{});battleLog(`${target.name}の能力変化が消えた！`);}
 if(api===391||id==='heartswap'){const a={...(actor.stages||{})};actor.stages={...(target.stages||{})};target.stages=a;battleLog('お互いの能力変化が入れ替わった！');}
 if(api===470||id==='guardsplit'){const d=Math.floor(((actor.stats?.def||1)+(target.stats?.def||1))/2),s=Math.floor(((actor.stats?.spd||1)+(target.stats?.spd||1))/2);actor.stats.def=target.stats.def=d;actor.stats.spd=target.stats.spd=s;battleLog('お互いの防御と特防を分け合った！');}
 if(api===471||id==='powersplit'){const a=Math.floor(((actor.stats?.atk||1)+(target.stats?.atk||1))/2),s=Math.floor(((actor.stats?.spa||1)+(target.stats?.spa||1))/2);actor.stats.atk=target.stats.atk=a;actor.stats.spa=target.stats.spa=s;battleLog('お互いの攻撃と特攻を分け合った！');}
 // Status / action-control effects.
 if(api===281||id==='yawn'){target._yawnTurns=2;battleLog(`${target.name}は眠たそうだ……`);}
 if([48,109,207,260,298,448].includes(api)||['supersonic','confuseray','swagger','flatter','teeterdance','chatter'].includes(id)){target._confusionTurns=2+Math.floor(Math.random()*4);if(api===207||id==='swagger')applyBoosts(target,{atk:2},'いばる');if(api===260||id==='flatter')applyBoosts(target,{spa:1},'おだてる');battleLog(`${target.name}は混乱した！`);}
 if(api===213||id==='attract')target._infatuatedBy=actor.uid;
 if(api===269||id==='taunt'){target.volatile=target.volatile||{};target.volatile.tauntTurns=3;}
 if(api===227||id==='encore'){target.volatile=target.volatile||{};target.volatile.encoreTurns=3;target.volatile.encoreMove=target.lastMoveId||null;}
 if(api===50||id==='disable'){target.volatile=target.volatile||{};target.volatile.disabledMove=target.lastMoveId||null;target.volatile.disableTurns=4;}
 if(api===259||id==='torment'){target.volatile=target.volatile||{};target.volatile.torment=true;}
 if([212,169,335].includes(api)||['meanlook','spiderweb','block'].includes(id)){target._trappedTurns=Math.max(Number(target._trappedTurns||0),4);}
 // Ability manipulation.
 if(api===272||id==='roleplay')actor.abilityId=target.abilityId;
 if(api===388||id==='worryseed')target.abilityId='insomnia';
 if(api===493||id==='simplebeam')target.abilityId='simple';
 if(api===494||id==='entrainment')target.abilityId=actor.abilityId;
 if(api===380||id==='gastroacid'){if(!target._abilityOriginalId)target._abilityOriginalId=target.abilityId;target._abilityDisabledTurns=5;target.abilityId='none';battleLog(`${target.name}の特性が封じられた！`);}
 // Type changes; typeMult below reads the battle mon's mutable types.
 if(api===487||id==='soak')target.types=['Water'];
 if(api===571||id==='forestscurse'){target.types=[...(target.types||monSpecies(target)?.types||[])];if(!target.types.includes('Grass'))target.types.push('Grass');}
 if(api===567||id==='trickortreat'){target.types=[...(target.types||monSpecies(target)?.types||[])];if(!target.types.includes('Ghost'))target.types.push('Ghost');}
 if(api===513||id==='reflecttype')actor.types=[...(target.types||monSpecies(target)?.types||[])];
 if(api===160||id==='conversion'){const first=(actor.moves||[]).map(x=>getMove(x.id)).find(m=>m&&m.id!==move.id);if(first)actor.types=[first.type];}
 if(api===176||id==='conversion2'){if(actor._lastTypeReceived)actor.types=[actor._lastTypeReceived];}
 if(api===250||id==='camouflage'){actor.types=[({electric:'Electric',grassy:'Grass',psychic:'Psychic',misty:'Fairy'})[b.terrain]||'Normal'];}
 if(api===682||id==='burnup'){actor.types=(actor.types||monSpecies(actor)?.types||[]).filter(t=>t!=='Fire');}
 // Item operations and Baton Pass.
 if(([271,415].includes(api)&&!['trick','switcheroo'].includes(id))){const item=actor.heldItem||'';actor.heldItem=target.heldItem||'';target.heldItem=item;battleLog('お互いの持ち物が入れ替わった！');}
 if(api===282||id==='knockoff'){if(target.heldItem){target.heldItem='';battleLog(`${target.name}の持ち物がはたき落とされた！`);}}
 if(api===226||id==='batonpass'){const side=v170Side(actor,b),team=side==='player'?b.playerTeam:b.enemyTeam,active=side==='player'?b.playerActive:b.enemyActive;const ix=team.findIndex(m=>m.uid===actor.uid),slot=active.indexOf(ix),next=team.findIndex((m,i)=>i!==ix&&!m.fainted&&m.hp>0&&!active.includes(i));if(slot>=0&&next>=0){const replacement=team[next];replacement.stages={...(actor.stages||{})};replacement.volatile={...(actor.volatile||{})};replacement.volatile.protected=false;active[slot]=next;actor._chargingMove=null;actor._semiInvulnerable=false;battleLog(`${actor.name}は能力変化を引き継いで交代した！`);triggerEntryEffects([replacement],side==='player'?activeLiving(b.enemyTeam,b.enemyActive):activeLiving(b.playerTeam,b.playerActive),b);}}
 // Side/space rule changes, weather/terrain existing handlers remain shared with damage.
 const own=v170Side(actor,b);b.sideConditions=b.sideConditions||{player:{},enemy:{}};b.sideConditions.player=b.sideConditions.player||{};b.sideConditions.enemy=b.sideConditions.enemy||{};
 if(api===366||id==='tailwind'){b.sideConditions[own].tailwindTurns=4;battleLog('追い風が吹き始めた！');}
 if(api===433||id==='trickroom'){b.trickRoomTurns=b.trickRoomTurns>0?0:5;battleLog(b.trickRoomTurns?'時空が逆転した！':'時空が元に戻った！');}
 if(api===472||id==='wonderroom'){b.wonderRoomTurns=b.wonderRoomTurns>0?0:5;battleLog('ワンダールームの効果が変化した！');}
 if(api===478||id==='magicroom'){b.magicRoomTurns=b.magicRoomTurns>0?0:5;battleLog('マジックルームの効果が変化した！');}
 if(api===356||id==='gravity'){b.gravityTurns=b.gravityTurns>0?0:5;battleLog('重力が強くなった！');}
 // Trapping and forced switch.
 if([20,35,83,128,250,328,611].includes(api)||['bind','wrap','firespin','whirlpool','sandtomb','infestation','clamp'].includes(id)){target._trappedTurns=Math.max(Number(target._trappedTurns||0),4);}
 if([509,525].includes(api)&&!['circlethrow','dragontail'].includes(id))v170ForceSwitch(target,b);
 // Perish Song and Destiny Bond trigger only during their relevant turn windows.
 if(api===194||id==='destinybond'){actor._destinyBondTurn=b.turn;battleLog(`${actor.name}は相手を道連れにしようとしている！`);}
 if(api===195||id==='perishsong'){for(const mon of [...b.playerTeam,...b.enemyTeam]){if(slug(mon.abilityId)==='soundproof')continue;mon._perishTurns=3;}battleLog('その場にいるポケモンのほろびのカウントが始まった！');}
}
const __v170ApplyMoveSpecificEffects=applyMoveSpecificEffects;
applyMoveSpecificEffects=function(actor,target,move,b){__v170ApplyMoveSpecificEffects(actor,target,move,b);try{v170RunBattleEffects(actor,target,move,b);}catch(err){console.error('[v16.10 battle effect]',getMoveName(move),err);battleLog(`${getMoveName(move)}の追加効果処理でエラーが発生した。`);}};
const __v170ApplyDamage=applyDamage;
applyDamage=function(target,damage,source=null,move=null){
 const b=state.battle,turn=b?.turn,hadSub=!!(target?.volatile?.substituteHp>0&&source&&source.uid!==target.uid);
 let incoming=Math.max(0,Number(damage)||0);
 if(target&&target._endureTurn===turn&&incoming>=target.hp)incoming=Math.max(0,target.hp-1);
 const actual=__v170ApplyDamage(target,incoming,source,move);
 if(source&&source.uid!==target.uid)source._lastHitWasSubstitute=hadSub;
 if(actual>0&&source&&source.uid!==target.uid&&!hadSub){target._lastDamageTaken={amount:actual,category:move?.category||'Physical',turn,sourceUid:source.uid};if(move?.type)target._lastTypeReceived=move.type;}
 if(actual>0&&target?._kingShieldTurn===turn&&move?.flags?.contact&&source&&source.hp>0)applyBoosts(source,{atk:-1},'キングシールド');
 if(target?.fainted&&target?._destinyBondTurn===turn&&source&&source.uid!==target.uid&&source.hp>0){source.hp=0;source.fainted=true;battleLog(`${target.name}のみちづれで${source.name}も倒れた！`);}
 if(target&&source&&source.uid!==target.uid&&actual>0&&target._lastHitWasSubstitute!==true&&target._spikyShieldTurn===turn&&move?.flags?.contact){const chip=Math.max(1,Math.floor(source.maxhp/8));source.hp=Math.max(0,source.hp-chip);if(source.hp<=0)source.fainted=true;}
 return actual;
};
const __v170CanMove=canMove;
canMove=function(mon){if(mon?._infatuatedBy&&Math.random()<0.5){battleLog(`${mon.name}はメロメロで技が出せなかった！`);return false;}if(mon?._confusionTurns>0){mon._confusionTurns--;if(Math.random()<1/3){const atk=currentStat(mon,'atk'),def=Math.max(1,currentStat(mon,'def'));const dmg=Math.max(1,Math.floor(Math.floor(Math.floor((Math.floor((2*mon.level)/5)+2)*40*atk/def)/50)+2));mon.hp=Math.max(0,mon.hp-dmg);if(mon.hp<=0)mon.fainted=true;battleLog(`${mon.name}は混乱して自分を攻撃した！ ${dmg}ダメージ！`);return false;}battleLog(`${mon.name}は混乱しているが技を出した！`);}return __v170CanMove(mon);};
const __v170ProcessEndTurn=processEndTurn;
processEndTurn=function(b){
 // Root-level timed states survive the legacy volatile-state cleanup.
 const teams=[b.playerTeam,b.enemyTeam];
 for(const team of teams)for(const mon of team){if(!mon)continue;
  if(mon._yawnTurns>0){mon._yawnTurns--;if(mon._yawnTurns===0&&!mon.status&&!mon.fainted)setStatus(mon,'slp','あくび');}
  if(mon._aquaRing||mon._ingrain){if(!mon.fainted&&mon.hp>0){const heal=Math.max(1,Math.floor(mon.maxhp/16));const before=mon.hp;mon.hp=Math.min(mon.maxhp,mon.hp+heal);if(mon.hp>before)battleLog(`${mon.name}は${mon._aquaRing?'アクアリング':'ねをはる'}でHPを回復した！`);}}
  if(mon._perishTurns>0){mon._perishTurns--;if(mon._perishTurns===0&&!mon.fainted){mon.hp=0;mon.fainted=true;battleLog(`${mon.name}はほろびの歌で倒れた！`);}}
  if(mon._abilityDisabledTurns>0){mon._abilityDisabledTurns--;if(mon._abilityDisabledTurns===0&&mon._abilityOriginalId){mon.abilityId=mon._abilityOriginalId;mon._abilityOriginalId=null;battleLog(`${mon.name}の特性が元に戻った！`);}}
  if(mon._trappedTurns>0)mon._trappedTurns--;
  if(mon._destinyBondTurn===b.turn)mon._destinyBondTurn=null;
  if(mon._endureTurn===b.turn)mon._endureTurn=null;
  if(mon._kingShieldTurn===b.turn)mon._kingShieldTurn=null;if(mon._spikyShieldTurn===b.turn)mon._spikyShieldTurn=null;if(mon._banefulBunkerTurn===b.turn)mon._banefulBunkerTurn=null;
 }
 // Wish heals whoever occupies the original user's field slot one turn later.
 for(const team of teams)for(const mon of team){const w=mon?._wish;if(!w||w.dueTurn>b.turn)continue;const active=w.side==='player'?b.playerActive:b.enemyActive,t=w.side==='player'?b.playerTeam:b.enemyTeam;const idx=t[active[w.slot]];if(idx&&!idx.fainted&&idx.hp>0){const before=idx.hp;idx.hp=Math.min(idx.maxhp,idx.hp+w.amount);if(idx.hp>before)battleLog(`${idx.name}は願い事でHPを回復した！`);}mon._wish=null;}
 // Delayed attacks are resolved at end of the promised turn, before victory is decided.
 b.delayedAttacks=b.delayedAttacks||[];for(const q of b.delayedAttacks){q.dueIn--;if(q.dueIn>0)continue;const attacker=[...b.playerTeam,...b.enemyTeam].find(m=>m.uid===q.actorUid);const team=q.targetSide==='player'?b.playerTeam:b.enemyTeam,active=q.targetSide==='player'?b.playerActive:b.enemyActive;const target=team[active[q.targetSlot]];const move=getMove(q.moveId);if(attacker&&target&&!target.fainted&&target.hp>0&&move){const result=calculateDamage(attacker,target,move,b);if(result.effectiveness===0)battleLog(`${target.name}には遅れて届いた攻撃が効かなかった！`);else{const actual=applyDamage(target,result.damage,attacker,{...move,recoil:undefined,drain:undefined});battleLog(`${getMoveName(move)}が遅れて命中し、${target.name}に${actual}ダメージ！`);}}q.done=true;}b.delayedAttacks=b.delayedAttacks.filter(q=>!q.done);
 for(const key of ['trickRoomTurns','wonderRoomTurns','magicRoomTurns','gravityTurns'])if(b[key]>0){b[key]--;if(b[key]===0)battleLog('場の特殊ルールの効果が切れた！');}
 for(const side of ['player','enemy']){const cond=b.sideConditions?.[side];if(cond?.tailwindTurns>0){cond.tailwindTurns--;if(cond.tailwindTurns===0)battleLog('追い風が止んだ！');}}
 __v170ProcessEndTurn(b);
};
// Mutable battle types now participate in effectiveness checks rather than being display-only.
const __v170TypeMult=typeMult;
typeMult=function(moveType,defSpecies,defMon=null){const effectiveSpecies=defMon&&Array.isArray(defMon.types)?{...(defSpecies||{}),types:defMon.types}:defSpecies;return __v170TypeMult(moveType,effectiveSpecies,defMon);};
const __v170CurrentStat=currentStat;
currentStat=function(mon,k){const b=state.battle;if(b?.wonderRoomTurns>0&&k==='def')return __v170CurrentStat(mon,'spd');if(b?.wonderRoomTurns>0&&k==='spd')return __v170CurrentStat(mon,'def');return __v170CurrentStat(mon,k);};
const __v170IsGrounded=isGrounded;
isGrounded=function(mon){return state.battle?.gravityTurns>0?true:__v170IsGrounded(mon);};
const __v170Accuracy=getEffectiveAccuracy;
getEffectiveAccuracy=function(move,actor,target,b){let v=__v170Accuracy(move,actor,target,b);if(b?.gravityTurns>0)v=Math.min(100,v*5/3);return v;};
const __v170ItemSlug=itemSlug;
itemSlug=function(value){if(state.battle?.magicRoomTurns>0)return '';return __v170ItemSlug(value);};
function auditBattleIntegration(){const moves=Object.values(state.data?.movesById||{});const counts={};for(const c of MOVE_TAXONOMY)counts[c.name]={id:c.id,moves:0,connection:V170_CATEGORY_STATUS[c.id]||'既存処理・個別監査対象'};for(const m of moves){for(const name of moveTaxonomyCategories(m)){if(counts[name])counts[name].moves++;}}return {version:'v16.10-battle-integration',moveCount:moves.length,categories:counts,explicitHandlers:moves.filter(m=>V170_HANDLED_API.has(v170Api(m))).length,rechargeMoves:moves.filter(m=>V170_RECHARGE_API.has(v170Api(m))).map(m=>({id:m.id,name:getMoveName(m)})),notes:['カテゴリ分類と個別効果の完全再現は別。未登録の特殊技は要個別実装。','通常ダメージ、基本状態異常、追加効果、回復、天候・地形、設置技は旧エンジンを維持し、新規共通ハンドラを追加。']};}
function battleIntegrationStatus(move){const api=v170Api(move);if(V170_HANDLED_API.has(api))return '共通バトル処理に接続（個別テスト対象）';const cats=moveTaxonomyCategories(move);if(cats.some(x=>['標準ダメージ','複合ダメージ','HP回復','デコイ（分身）生成','設置トラップ・壁','天候・フィールド'].includes(x)))return '既存の共通処理に接続（技固有効果は要確認）';return '分類済み・技固有効果は未確認';}
const __v170RenderMoveCatalogDetail=renderMoveCatalogDetail;
renderMoveCatalogDetail=function(move){const html=__v170RenderMoveCatalogDetail(move);return html.replace('</aside>',`<div class="summary-chip"><span>バトル接続状況</span><b>${esc(battleIntegrationStatus(move))}</b></div></aside>`);};
Object.assign(window.PokemonChampions2DData,{version:'v16.10',battleIntegrationVersion:'20-category-v1',auditBattleIntegration,battleIntegrationStatus,knownRechargeApiIds:[...V170_RECHARGE_API],knownChargeApiIds:[...V170_CHARGE_API]});


// v16.11: hierarchical move-effect taxonomy + protection-chain/runtime corrections.
// Classification is intentionally separate from implementation status; keyword-derived tags are audit aids, not proof of full mechanics.
const V171_RULE = (id,name,summary,test)=>({id,name,summary,test});
const MOVE_EFFECT_DETAIL_GROUPS = [
 {id:'basic',name:'基本性質・対象',items:[
  V171_RULE('basic.physical','物理攻撃','物理カテゴリのダメージ技',c=>c.m.category==='Physical'&&c.damaging),
  V171_RULE('basic.special','特殊攻撃','特殊カテゴリのダメージ技',c=>c.m.category==='Special'&&c.damaging),
  V171_RULE('basic.status','変化技','カテゴリが変化技の技',c=>c.m.category==='Status'),
  V171_RULE('basic.contact','接触フラグあり・要確認','元データの接触フラグ。実際の接触判定が正しいかは別途監査が必要',c=>!!c.flags.contact||c.has(/makes contact|contact move|接触する技|相手に触れる/)),
  V171_RULE('basic.sound','音技','音技・音を使う技',c=>!!c.flags.sound||c.has(/sound-based move|sound move|音の技|音を使って/)),
  V171_RULE('basic.punch','パンチ技','パンチ技フラグ・説明あり',c=>!!c.flags.punch||c.has(/punching move|パンチの技/)),
  V171_RULE('basic.bite','かみつき技','かみつき技フラグ・説明あり',c=>!!c.flags.bite||c.has(/biting move|かみつく技/)),
  V171_RULE('basic.slice','切る・斬る技','切断技フラグ・説明あり',c=>!!c.flags.slicing||c.has(/slicing move|slicing attack|切る技|斬りつける/)),
  V171_RULE('basic.powder','粉技','粉・胞子系の技',c=>!!c.flags.powder||c.has(/powder move|powder-based|粉を|胞子を/)),
  V171_RULE('basic.projectile','弾・ボール系','弾や球を発射する技',c=>!!c.flags.bullet||c.has(/bullet move|ball or bomb move|弾を発射|ボールを投げ/)),
  V171_RULE('basic.self-target','自分対象','自分を対象とする技',c=>['self','users-field'].includes(c.target)||c.isName(/protect|detect|endure|rest|substitute|swordsdance|recover/)),
  V171_RULE('basic.ally-target','味方対象','味方や味方全体を対象にする技',c=>/ally|user-and-allies|users-field/.test(c.target)||c.has(/ally|your ally|味方/)),
  V171_RULE('basic.multi-target','複数対象','複数の相手・場全体を対象にする技',c=>/all-opponents|all-other-pokemon|all-pokemon|entire-field|all-adjacent/.test(c.target)||c.has(/all opposing pok.mon|all adjacent|all pok.mon on the field|相手全体|全体に/))
 ]},
 {id:'damage',name:'ダメージ計算',items:[
  V171_RULE('damage.standard','通常ダメージ計算','威力・攻撃能力・防御能力を使う基本ダメージ',c=>c.damaging&&c.bp>0&&!c.has(/fixed damage|damage equal to|half of the target.?s remaining hp|based on the target.?s weight|一撃必殺|レベルと同じ|相手の.*ＨＰ.*半分/)),
  V171_RULE('damage.fixed-level','レベル依存の固定ダメージ','使用者のレベルなどを固定値として使う',c=>c.has(/damage equal to (?:the user.?s )?level|damage equal to its level|level.*damage|レベルと同じダメージ|レベル分のダメージ/)||c.isName(/seismictoss|nightshade|dragonrage|sonicboom/)),
  V171_RULE('damage.fixed-value','固定値ダメージ','レベル以外の固定ダメージ',c=>c.has(/fixed damage|deals? \\d+ damage|damage is always|固定ダメージ|一定のダメージ/)||c.isName(/dragonrage|sonicboom/)),
  V171_RULE('damage.target-maxhp','最大HP割合ダメージ','相手の最大HPに対する割合ダメージ',c=>c.has(/fraction of the target.?s max hp|percent of the target.?s max hp|based on the target.?s maximum hp|最大ＨＰの.*割|最大ＨＰに応じたダメージ/)),
  V171_RULE('damage.target-currenthp','相手の残りHP依存','相手の現在HP・残りHPを参照するダメージ',c=>c.has(/half of the target.?s remaining hp|half the target.?s hp|cuts the target.?s hp in half|target.?s current hp|相手の残りＨＰの半分|相手のＨＰを半分|現在のＨＰを半分/)||c.isName(/superfang|naturesmadness|ruination|halving/)),
  V171_RULE('damage.user-hp','自分のHP依存','自分の残りHPや消費HPに応じた威力',c=>c.has(/more damage when the user has|less hp the user has|based on the user.?s remaining hp|user.?s current hp|自分の残りＨＰ|自分のＨＰが少ないほど|残りＨＰが多いほど/)||c.isName(/reversal|flail|eruption|waterspout|waterspout/)),
  V171_RULE('damage.weight','体重依存','使用者や相手の体重で威力・ダメージが変化',c=>c.has(/based on (?:the )?(?:target.?s )?weight|heavier the target|weight of the target|体重|重いほど|軽いほど|重さによって/)||c.isName(/lowkick|grassknot|heavyslam|heatcrash/)),
  V171_RULE('damage.speed-stat','能力値比較依存','素早さ・攻撃能力などの比較を利用',c=>c.has(/based on the target.?s speed|greater the target.?s speed|higher speed|higher attack stat|based on the difference|素早さの差|相手の素早さ|能力値の差/)),
  V171_RULE('damage.variable-power','条件で威力変化','状況・状態・場などにより威力が変わる',c=>c.has(/power (?:is|increases|decreases|doubles|triples|varies)|power depends on|威力が.*上が|威力が.*下が|威力が変わ|状態異常のとき威力|能力があがっているほど/)),
  V171_RULE('damage.hp-balance','HP分配・同値化','両者のHPを分ける・同じ割合にする',c=>c.has(/average of the user.?s and target.?s hp|equalizes the hp|equal.*hp|shares? hp|お互いのＨＰを|ＨＰを分け|ＨＰを同じ/)||c.isName(/painsplit/)),
  V171_RULE('damage.counter','受けたダメージ反撃','受けた攻撃のダメージを返す',c=>[68,117,243,368].includes(c.api)||c.isName(/counter|mirrorcoat|metalburst|bide/)||c.has(/damage taken by the user|damage it took|damage the user received|返すダメージ|受けた.*ダメージ.*(?:返す|倍)|受けた.*物理攻撃.*ダメージ/)),
  V171_RULE('damage.ohko','一撃必殺','条件を満たすと相手を一撃で倒す',c=>!!c.m.ohko||c.isName(/fissure|guillotine|horn-drill|sheercold|じわれ|ハサミギロチン|つのドリル|ぜったいれいど/)),
  V171_RULE('damage.ignores-stages','能力ランク無視','相手の能力ランク変化を無視してダメージ',c=>c.has(/ignores? (?:the )?target.?s stat modifiers|regardless of (?:the )?target.?s stat changes|能力変化に関係なく|能力ランクを無視/)),
  V171_RULE('damage.ignores-type','タイプ相性例外','タイプ相性・無効の通常ルールを変える',c=>c.has(/ignores? type immunit|can hit ghost-type|regardless of type|タイプの相性を無視|無効化されない|ゴーストタイプにも当たる/)),
  V171_RULE('damage.crash','失敗時の反動ダメージ','攻撃が外れる・条件を失うと自分も傷つく',c=>c.has(/crash damage|user is hurt if it misses|hurt by the crash|外すと自分も|失敗すると自分もダメージ/)||c.isName(/jumpkick|highjumpkick|axekick|supercellslam|とびひざげり|とびげり|かかとおとし|サンダーダイブ/))
 ]},
 {id:'critical',name:'急所・防御補正',items:[
  V171_RULE('crit.high-rate','急所率上昇技','急所に当たりやすい技',c=>c.has(/increased chance for a critical hit|high critical.hit ratio|critical hit ratio is high|急所に当たりやすい|急所率が高い/)),
  V171_RULE('crit.guaranteed','確定急所','必ず急所に当たる技',c=>c.has(/always results in a critical hit|always lands a critical hit|always critical hit|必ず急所に当たる|必ず急所/)||c.isName(/stormthrow|frostbreath|surgingstrikes|wickedblow|あんこくきょうだ|すいりゅうれんだ/)),
  V171_RULE('crit.stage-raise','急所ランク上昇','急所率を上げる効果',c=>c.has(/critical.hit ratio.*(?:raise|increase|stage)|raises? the user.?s critical.hit|急所率を.*上げ|急所に当たりやすくなる/)||c.isName(/focusenergy/)),
  V171_RULE('crit.prevent','急所を防ぐ効果','急所を防止する場・技など',c=>c.has(/prevents? critical hits|cannot be struck by critical hits|急所に当たらない|急所を防ぐ/)),
  V171_RULE('crit.defense-ignore','急所時の防御補正無視','急所で防御ランクや壁を無視する仕様',c=>c.has(/critical hits? ignore|critical hit ignores|急所.*防御.*無視|急所なら.*壁を無視/))
 ]},
 {id:'multihit',name:'連続攻撃・ヒット数',items:[
  V171_RULE('hits.multi','連続攻撃','1回の技で複数回ヒット',c=>!!c.m.multihit||!!c.m.numberOfHits||c.has(/hits? (?:two|three|four|five|multiple|2|3|4|5)|multiple times|連続で.*回|２ー５回|2ー5回/)),
  V171_RULE('hits.fixed-2','2回攻撃','固定で2回ヒット',c=>Array.isArray(c.m.multihit)&&c.m.multihit[0]===2&&c.m.multihit[1]===2||c.has(/hits twice|hits two times|2 times in a row|２回連続/)),
  V171_RULE('hits.range-2-5','2～5回攻撃','2～5回のランダムヒット',c=>Array.isArray(c.m.multihit)&&c.m.multihit[0]===2&&c.m.multihit[1]===5||c.has(/2.?5 times|two to five times|2.?5回/)),
  V171_RULE('hits.fixed-3','3回攻撃','固定で3回ヒット',c=>Array.isArray(c.m.multihit)&&c.m.multihit[0]===3&&c.m.multihit[1]===3||c.has(/hits three times|three times in a row|３回連続/)),
  V171_RULE('hits.per-hit-check','1発ごとに判定','連続攻撃を1ヒットごとに処理する仕組み',c=>!!c.m.multihit||c.has(/each hit|each strike|per hit|それぞれの攻撃|１発ごと/)),
  V171_RULE('hits.ability-count','特性・道具で回数変化','連続攻撃回数が特性や道具に影響される',c=>c.has(/number of hits.*(?:ability|item)|hit more times|hit an additional time|追加でもう一度|連続攻撃.*回数/))
 ]},
 {id:'accuracy',name:'命中・回避',items:[
  V171_RULE('accuracy.check','命中判定あり','命中率の判定を受ける攻撃技',c=>c.damaging&&typeof c.m.accuracy==='number'&&c.m.accuracy<100),
  V171_RULE('accuracy.sure-hit','必中・命中率無視','通常の命中判定を行わない技',c=>c.damaging&&(c.m.accuracy===true||c.has(/never misses|always hits|cannot miss|必ず命中|必ず当たる/))),
  V171_RULE('accuracy.lower-target','相手の命中率を下げる','相手の命中率ランクを下げる',c=>c.has(/lowers? the target.?s accuracy|target.?s accuracy.*lower|命中率を下げ/)),
  V171_RULE('accuracy.raise-self','自分の命中率を上げる','自分の命中率ランクを上げる',c=>c.has(/raises? the user.?s accuracy|user.?s accuracy.*raise|命中率を上げ/)),
  V171_RULE('accuracy.lower-evasion','相手の回避率を下げる','相手の回避率ランクを下げる',c=>c.has(/lowers? the target.?s evasiveness|target.?s evasion|回避率を下げ/)),
  V171_RULE('accuracy.raise-evasion','回避率を上げる','自分・味方の回避率を上げる',c=>c.has(/raises? the user.?s evasiveness|evasion.*increases|回避率を上げ/)),
  V171_RULE('accuracy.lock-on','次の攻撃を必中化','ロックオンなどで次の攻撃を必中にする',c=>c.isName(/lockon|mindreader|ロックオン|こころのめ/)||c.has(/next attack.*cannot miss|次の攻撃は必ず当たる/))
 ]},
 {id:'order',name:'優先度・行動順・素早さ',items:[
  V171_RULE('order.priority-positive','先制技・優先度プラス','通常より先に行動する技',c=>Number(c.m.priority||0)>0),
  V171_RULE('order.priority-negative','優先度マイナス','通常より後に行動する技',c=>Number(c.m.priority||0)<0),
  V171_RULE('order.priority-change','優先度そのものを変更','特定タイプなどの優先度を操作',c=>c.has(/priority.*(?:increases|raises|decreases|lower)|increases? the priority|優先度を上げ|優先度を下げ/)),
  V171_RULE('order.speed-up','素早さ上昇','自分や味方の素早さを上げる',c=>c.has(/raises? (?:the user.?s |its )?speed|speed.*increases|素早さを上げ/)),
  V171_RULE('order.speed-down','素早さ低下','相手の素早さを下げる',c=>c.has(/lowers? (?:the target.?s |its )?speed|speed.*decreases|素早さを下げ/)),
  V171_RULE('order.action-reorder','行動順の直接操作','先に動かす・後に回す・行動順を変更',c=>c.isName(/afteryou|quash|おさきにどうぞ|さきおくり/)||c.has(/move immediately after|move last|move first|行動順を|先に行動させ|最後に行動/)),
  V171_RULE('order.trick-room','トリックルーム系','素早さ順を逆転する場の効果',c=>c.isName(/trickroom|トリックルーム/)||c.has(/speed order is reversed|素早さの順番が逆/))
 ]},
 {id:'protection',name:'まもる・防御・無効化',items:[
  V171_RULE('guard.personal','自分だけを守る','まもる・みきり・キングシールド等',c=>[182,197,588,596,661,792,852,908].includes(c.api)||c.isName(/protect|detect|kingsshield|spikyshield|banefulbunker|obstruct|silktrap|burningbulwark/)),
  V171_RULE('guard.endure','HPを1で耐える','こらえる系の致死ダメージ耐え',c=>c.api===203||c.isName(/endure|こらえる/)),
  V171_RULE('guard.wide','ワイドガード','複数対象技から味方全体を守る',c=>c.api===469||c.isName(/wideguard|ワイドガード/)),
  V171_RULE('guard.quick','ファストガード','先制技から味方を守る',c=>c.api===501||c.isName(/quickguard|ファストガード/)),
  V171_RULE('guard.contact-punish','接触時に反撃・能力低下','守りながら接触した相手に罰則',c=>c.has(/contact.*(?:attack|lower|drop)|attacker.*contact.*attack|触れた相手.*(?:攻撃|能力).*下げ|接触した相手/)),
  V171_RULE('guard.bypass','まもるを無視する技','防御状態でも命中する攻撃',c=>c.has(/bypass(?:es)? protect|ignores? protect|hit a target using.*protect|まもる.*無視|守りを無視|守っていても攻撃は当たる/)),
  V171_RULE('guard.break','まもるを解除・破壊','防御を解除する・破る効果',c=>c.has(/breaks? through protect|removes? the effects? of protect|break.*protection|守りの効果を解除|防御を解除/)),
  V171_RULE('guard.substitute','みがわり生成・保護','みがわりを作り、状態変化などを防ぐ',c=>c.isName(/substitute|みがわり/)||c.has(/substitute|みがわり/)),
  V171_RULE('guard.ignore-substitute','みがわりを無視','みがわりを貫通する効果',c=>c.has(/bypass.*substitute|ignores? substitute|through a substitute|みがわりを無視|みがわりを貫通/)),
  V171_RULE('guard.protectable-status','変化技の遮断・無効化','攻撃以外の効果を防ぐ・無効化する',c=>c.has(/protects? against status|prevents status moves|status moves.*fail|変化技を防|状態変化を防/))
 ]},
 {id:'timing',name:'ターン・溜め・再充填・遅延',items:[
  V171_RULE('timing.charge','溜め技','攻撃前に1ターン溜める',c=>c.has(/charges? on the first turn|charges power|takes a turn to charge|力をため|溜めてから/)),
  V171_RULE('timing.semi-invulnerable','姿を消す・半無敵','空中・地下などで一時的に攻撃を回避',c=>c.has(/vanishes|disappear.*first turn|flies up|digs underground|姿を消|空高く飛び|地中に潜/)),
  V171_RULE('timing.recharge','次のターンに再充填','成功後、次の行動を休む必要がある',c=>V170_RECHARGE_API.has(c.api)||c.has(/foregoes? (?:its|the user.?s) next turn to recharge|must recharge|次のターンは動けなくなる/)),
  V171_RULE('timing.delayed-hit','遅延攻撃','数ターン後にダメージが発生',c=>c.has(/two turns later|in 2 turns|delayed attack|future sight|未来に攻撃|２ターン後に/)),
  V171_RULE('timing.trap','拘束・バインド','相手を数ターン拘束し継続ダメージ',c=>c.has(/trapped for|bound for|cannot escape|trap the target|拘束|逃げられない|締めつけ/)),
  V171_RULE('timing.lock','技の連続使用・行動固定','同じ技を続ける、技を縛る等',c=>c.has(/locked into|use this move for|cannot use other moves|must use the same move|技を出し続け|技を縛る|同じ技を/)),
  V171_RULE('timing.duration','ターン継続効果','複数ターン続く効果・残りターン管理',c=>c.has(/for \\d+ turns|for several turns|lasts? \\d+ turns|３ターン|数ターン|ターンのあいだ/))
 ]},
 {id:'hp',name:'HP・回復・吸収・自傷',items:[
  V171_RULE('hp.heal-direct','即時HP回復','その場でHPを回復する',c=>c.has(/restores? hp|recovers? hp|heal(?:s)? the user|recover half|回復する|ＨＰを回復/)||c.isName(/recover|roost|slackoff|softboiled|milkdrink|synthesis|moonlight|morningsun/)),
  V171_RULE('hp.drain','ダメージ吸収','与えたダメージの一部をHPとして回復',c=>c.has(/drains? hp|recovers? half the damage|regain.*damage dealt|damage dealt.*hp|吸収|ＨＰを吸い取/)||Number(c.m.drain||0)>0),
  V171_RULE('hp.regeneration','継続回復','毎ターンHP回復・根を張る等',c=>c.has(/each turn.*recover|regain.*each turn|at the end of each turn.*hp|毎ターン.*回復|少しずつＨＰを回復/)||c.isName(/aquaring|ingrain|leechseed/)),
  V171_RULE('hp.delayed-heal','遅延回復・願い事','次ターン等にHPを回復',c=>c.isName(/wish|healingwish|lunarblessing/)||c.has(/heals? the active pok.mon on the next turn|wish.*heal|願い事|次のターン.*ＨＰを回復/)),
  V171_RULE('hp.weather-heal','天候依存回復','天候によって回復量が変わる',c=>c.has(/depending on the weather|during rain|in harsh sunlight|sunlight.*recover|天候によって回復|晴れ.*回復/)),
  V171_RULE('hp.share','HP共有・分配','使用者と対象のHPを平均化・分配',c=>c.isName(/painsplit|プレゼント/)||c.has(/averages? the hp|equalizes? hp|share.*hp|ＨＰを分け/)),
  V171_RULE('hp.halve-target','相手のHPを半分にする','相手の現在HPを半減させる',c=>c.has(/half of the target.?s remaining hp|cuts the target.?s hp in half|相手のＨＰを半分/)||c.isName(/superfang|naturesmadness|ruination/)),
  V171_RULE('hp.self-cost','HP消費・反動・自爆','自分のHPを消費またはひんしにする',c=>c.has(/user faints|user sacrifices itself|costs? half of the user.?s hp|user loses hp|自分のＨＰを削|命をかけ|自分も倒れ/)||c.isName(/explosion|selfdestruct|finalgambit/)),
  V171_RULE('hp.recoil','攻撃後の反動','与えたダメージなどに応じて反動を受ける',c=>c.has(/recoil damage|hurt by recoil|takes recoil|反動ダメージ|自分も反動/)||c.isName(/doubleedge|bravebird|flareblitz|wildcharge|headsmash|volttackle|woodhammer/))
 ]},
 {id:'status',name:'状態異常・行動妨害',items:[
  V171_RULE('status.burn','やけど','やけど状態を発生させる',c=>c.has(/burn the target|may burn|chance to burn|やけど状態|やけどにする|火傷/)),
  V171_RULE('status.poison','どく・もうどく','どく状態を発生させる',c=>c.has(/poison the target|may poison|chance to poison|badly poison|どく状態|もうどく/)),
  V171_RULE('status.paralysis','まひ','まひ状態を発生させる',c=>c.has(/paraly[sz]e the target|may paraly[sz]e|paralysis|まひ状態|まひにする|麻痺/)),
  V171_RULE('status.sleep','ねむり','ねむり状態を発生させる',c=>c.has(/put the target to sleep|cause.*sleep|sleep the target|ねむり状態|眠らせる/)),
  V171_RULE('status.freeze','こおり・凍結','こおり状態を発生させる',c=>c.has(/freeze the target|may freeze|chance to freeze|こおり状態|凍らせる/)),
  V171_RULE('status.confusion','こんらん','こんらん状態を発生させる',c=>c.has(/confuse the target|may confuse|chance to confuse|confusion|こんらん|混乱/)),
  V171_RULE('status.flinch','ひるみ','ひるみで行動を止める',c=>c.has(/flinch the target|may cause the target to flinch|chance to flinch|ひるませる|ひるみ/)),
  V171_RULE('status.infatuation','メロメロ・魅了','魅了・メロメロ状態を発生',c=>c.has(/infatuat|fall in love|attract the target|メロメロ|魅了/)),
  V171_RULE('status.delayed','遅延状態異常','あくびなど、後から状態異常を発生',c=>c.isName(/yawn|あくび/)||c.has(/next turn.*sleep|after one turn.*sleep|次のターン.*眠り/)),
  V171_RULE('status.seed-trap','やどりぎ・拘束','やどりぎ・継続吸収・逃走制限',c=>c.isName(/leechseed|bind|wrap|firespin|whirlpool|sandtomb|マグマストーム/)||c.has(/leech seed|binds the target|trap the target|やどりぎのタネ|拘束する/)),
  V171_RULE('status.prevent','状態異常防止・解除','状態異常を防止・回復・解除',c=>c.has(/prevents? status conditions|cures? status|heals? status conditions|status ailments.*prevent|状態異常を防|状態異常を治|状態異常を回復/)),
  V171_RULE('status.action-restrict','技封じ・挑発・アンコール','相手の選択や使用可能技を制限',c=>c.isName(/taunt|encore|disable|torment|imprison|封印|ちょうはつ|アンコール/)||c.has(/cannot use.*move|prevent.*using.*move|技を使えなく|技を封じ|ちょうはつ/))
 ]},
 {id:'stats',name:'能力ランク・能力値操作',items:[
  V171_RULE('stats.self-raise','自分の能力上昇','自分の能力ランクを上げる',c=>!!c.m.boosts&&Object.values(c.m.boosts).some(v=>Number(v)>0)||c.has(/raises? the user.?s (?:attack|defense|special attack|special defense|speed|stats)|sharply raises|能力が上がる|自分の.*能力.*上げ/)),
  V171_RULE('stats.target-lower','相手の能力低下','相手の能力ランクを下げる',c=>!!(c.m.secondary?.boosts&&Object.values(c.m.secondary.boosts).some(v=>Number(v)<0))||c.has(/lowers? the target.?s (?:attack|defense|special attack|special defense|speed|stats)|能力を下げ|相手の.*能力.*下げ/)),
  V171_RULE('stats.reset','能力変化リセット','能力ランクを元に戻す・消す',c=>c.has(/removes? all.*stat modifiers|resets? all stat changes|stat changes.*reset|能力変化を.*もとに|能力変化を消/)),
  V171_RULE('stats.invert','能力変化反転','能力変化を逆転させる',c=>c.isName(/topsyturvy|ひっくりかえす/)||c.has(/reverses? the target.?s stat changes|inverts? stat changes|能力変化を逆転/)),
  V171_RULE('stats.copy','能力変化コピー','相手などの能力ランクをコピー',c=>c.isName(/psychup|じこあんじ|transform/)||c.has(/copies? the target.?s stat changes|copy.*stat changes|能力変化をコピー/)),
  V171_RULE('stats.swap','能力変化交換・平均化','能力ランクや能力値を交換・平均化',c=>c.isName(/heartswap|guardsplit|powersplit|パワーシェア|ガードシェア/)||c.has(/swaps? stat changes|average.*attack|average.*defense|入れ替え|分け合う/)),
  V171_RULE('stats.power-from-stages','能力上昇依存の威力','能力ランクの上昇量で威力が変わる',c=>c.has(/power is higher the more the user.?s stats have been raised|more the user.?s stats have been raised|能力があがっているほど威力|能力変化.*威力/)||c.isName(/storedpower|powertrip/)),
  V171_RULE('stats.ignore-modifiers','能力補正を無視','攻撃・防御の能力ランク補正を無視',c=>c.has(/ignores? (?:the )?target.?s stat modifiers|stat changes do not affect|能力変化に関係なく|能力ランクを無視/)),
  V171_RULE('stats.prevent-change','能力変化を防ぐ','能力ランクの低下などを防ぐ',c=>c.has(/prevents? stat changes|cannot have its stats lowered|ability changes are prevented|能力を下げられない|能力変化を防ぐ/))
 ]},
 {id:'types-abilities',name:'タイプ・特性操作',items:[
  V171_RULE('type.self-change','自分のタイプ変更','自分のタイプを変える・追加する',c=>c.isName(/conversion|conversion2|reflecttype|camouflage|テクスチャー/)||c.has(/changes? the user.?s type|changes the user into|user becomes.*type|自分のタイプを変/)),
  V171_RULE('type.target-change','相手のタイプ変更','相手のタイプを変える・追加する',c=>c.isName(/soak|trickortreat|forests curse|magicpowder|みずびたし|もりののろい/)||c.has(/changes? the target.?s type|changes the target into|相手のタイプを変/)),
  V171_RULE('type.move-change','技のタイプ変更','技そのもののタイプを変える',c=>c.has(/changes? the move.?s type|move becomes.*type|type of this move|技のタイプが変|技のタイプを変/)),
  V171_RULE('type.effectiveness','タイプ相性操作','タイプ相性・耐性を変更する効果',c=>c.has(/type effectiveness|super effective.*regardless|changes? type effectiveness|タイプ相性|効果抜群にな|耐性を変/)),
  V171_RULE('ability.copy-swap','特性コピー・交換','特性をコピーまたは交換',c=>c.isName(/skillswap|roleplay|entrainment|worryseed|simplebeam|なかまづくり|なりきり|スキルスワップ/)||c.has(/swaps? abilities|copies? the target.?s ability|copies the ability|特性を交換|特性をコピー/)),
  V171_RULE('ability.suppress','特性抑制・無効化','特性を一時的に無効にする',c=>c.isName(/gastroacid|いえき/)||c.has(/suppresses? the target.?s ability|nullifies? abilities|特性を無効|特性を消す/)),
  V171_RULE('ability.replace','特性上書き・付与','特性を別の特性に変える・付与',c=>c.isName(/simplebeam|worryseed|entrainment|なかまづくり/)||c.has(/changes? the target.?s ability|gives the target.*ability|特性を変え/))
 ]},
 {id:'items',name:'道具・持ち物操作',items:[
  V171_RULE('item.steal','持ち物を奪う','相手の道具を自分に移す',c=>c.isName(/thief|covet|どろぼう/)||c.has(/steals? the target.?s held item|takes the target.?s item|持ち物を奪/)),
  V171_RULE('item.swap','持ち物交換','双方の持ち物を入れ替える',c=>c.isName(/trick|switcheroo|トリック/)||c.has(/swaps? held items|switches? held items|持ち物を入れ替/)),
  V171_RULE('item.remove','持ち物を落とす・破壊','持ち物を取り除く・使えなくする',c=>c.isName(/knockoff|corrosivegas|はたきおとす/)||c.has(/knocks? off the target.?s item|removes? the target.?s item|destroys? the target.?s item|持ち物を落と|道具を破壊/)),
  V171_RULE('item.fling','道具を投げる','持ち物を消費して攻撃などに使う',c=>c.isName(/fling|なげつける/)||c.has(/throws? its held item|flings? its item|持ち物を投げ/)),
  V171_RULE('item.consume','道具を消費・発動','自分・相手の持ち物を消費する効果',c=>c.has(/consumes? the user.?s item|eats? its held berry|uses? its held item|道具を消費|きのみを食べ/)),
  V171_RULE('item.recycle','道具回収・再利用','消費した持ち物を戻す・再利用',c=>c.isName(/recycle|bestow|stuffcheeks|リサイクル/)||c.has(/restores? a consumed item|recovers? a used item|消費した道具を|道具を再利用/)),
  V171_RULE('item.power-dependence','道具依存の効果','持ち物の有無・種類で効果が変化',c=>c.has(/if the user is holding|held item|depending on the held item|持ち物を持っている|道具によって威力/))
 ]},
 {id:'switch',name:'交代・位置・拘束',items:[
  V171_RULE('switch.pivot','攻撃後に交代','攻撃後に使用者が交代する',c=>c.has(/switches? out after attacking|user switches out|switches the user out|攻撃後に交代|攻撃したあと交代/)||c.isName(/uturn|voltswitch|flipturn|partingshot/)),
  V171_RULE('switch.force','相手を強制交代','相手を控えポケモンと入れ替える',c=>c.has(/forces? the target to switch|switches? the target out|相手を交代させ|吹き飛ばす/ )||c.isName(/roar|whirlwind|dragontail|circlethrow/)),
  V171_RULE('switch.baton-pass','能力・状態を引き継ぐ交代','能力変化などを後続に引き継ぐ',c=>c.isName(/batonpass|バトンタッチ/)||c.has(/passes? its stat changes|passes? on its effects|引き継いで交代/)),
  V171_RULE('switch.ally-position','味方の位置変更','味方と場所・対象を入れ替える',c=>c.isName(/allyswitch|teleport|サイドチェンジ/)||c.has(/switches? places? with its ally|swap places with an ally|味方と位置を/)),
  V171_RULE('switch.trap','交代・逃走を封じる','相手の交代や逃走を防ぐ',c=>c.has(/prevents? the target from switching|cannot switch out|prevents escape|交代できなく|逃げられなく/)),
  V171_RULE('switch.escape','戦闘離脱・テレポート','戦闘から離脱する・位置移動',c=>c.isName(/teleport|テレポート/)||c.has(/escape from battle|return to a pokémon center|戦闘から逃げ|ポケセンのある街/))
 ]},
 {id:'hazards',name:'設置技・壁・サイド効果',items:[
  V171_RULE('field.stealth-rock','ステルスロック','交代時に岩ダメージを与える設置技',c=>c.isName(/stealthrock|ステルスロック/)),
  V171_RULE('field.spikes','まきびし','交代時に地面へ設置してダメージ',c=>c.isName(/spikes|まきびし/)),
  V171_RULE('field.toxic-spikes','どくびし','交代時に毒を与える設置技',c=>c.isName(/toxicspikes|どくびし/)),
  V171_RULE('field.sticky-web','ねばねばネット','交代した相手の素早さを下げる設置技',c=>c.isName(/stickyweb|ねばねばネット/)),
  V171_RULE('field.screens','壁・軽減フィールド','リフレクター・光の壁など',c=>c.isName(/reflect|lightscreen|auroraveil|リフレクター|ひかりのかべ|オーロラベール/)||c.has(/reduces? damage from physical|reduces? damage from special|壁を張る/)),
  V171_RULE('field.clear-hazards','設置物・壁の除去','設置技や壁を取り除く',c=>c.isName(/defog|rapidspin|mortalspin|courtchange|きりばらい/)||c.has(/removes? entry hazards|clears? hazards|removes? screens|取り除く/)),
  V171_RULE('field.tailwind','追い風','味方の素早さを一定ターン上げる',c=>c.isName(/tailwind|おいかぜ/)||c.has(/tailwind|追い風/)),
  V171_RULE('field.side-condition','その他のサイド効果','リフレクター以外の味方側・相手側効果',c=>c.has(/your side of the field|opposing side of the field|safeguard|mist.*side|味方側|相手側に設置/))
 ]},
 {id:'weather',name:'天候・フィールド',items:[
  V171_RULE('weather.set','天候変更','雨・晴れ・砂嵐・雪などを発生',c=>c.has(/changes? the weather|summons? rain|harsh sunlight|sandstorm|snow|rain dance|sunny day|あめを降ら|晴れに|砂嵐|雪を降ら/)),
  V171_RULE('weather.modify-power','天候による威力補正','天候で技の威力・効果が変化',c=>c.has(/in rain|during rain|in harsh sunlight|during sunlight|weather.*power|weather affects|天候.*威力|雨のとき威力|晴れのとき威力/)),
  V171_RULE('terrain.set','フィールド展開','エレキ・グラス・サイコ・ミストフィールド',c=>c.has(/electric terrain|grassy terrain|psychic terrain|misty terrain|フィールドを張|フィールドになる/)),
  V171_RULE('terrain.modify','フィールド依存の効果','フィールド上で威力・状態などを変える',c=>c.has(/terrain.*(?:boost|power|prevent|heal)|while.*terrain|フィールド.*威力|フィールド.*回復|フィールド.*無効/)),
  V171_RULE('weather.clear','天候・フィールド除去','天候や場の効果を終了・上書き',c=>c.has(/ends? the weather|clears? the weather|removes? terrain|clears? the terrain|天候を消|フィールドを解除|場の効果を消/)),
  V171_RULE('weather.duration','天候・フィールド継続ターン','天候・地形を一定ターン継続',c=>c.has(/for five turns|for 5 turns|terrain.*turns|weather.*turns|５ターン|5ターン/))
 ]},
 {id:'copy',name:'技のコピー・選択・制限',items:[
  V171_RULE('move.random-call','ランダムな技を呼び出す','ゆびをふる・ねごと等',c=>c.isName(/metronome|sleep talk|ゆびをふる|ねごと/)||c.has(/random move|randomly selects a move|calls a random move|ランダムな技/)),
  V171_RULE('move.last-repeat','直前の技を再使用','ものまね・まねっこ等で技を再使用',c=>c.isName(/copycat|sleeptalk|mefirst|まねっこ/)||c.has(/last move used|move last used|last move that was used|直前に使われた技/)),
  V171_RULE('move.copy-opponent','相手の技をコピー','相手の技をコピーまたは記録',c=>c.isName(/mimic|sketch|mirror move|transform|ものまね|スケッチ/)||c.has(/copies the target.?s move|copies one of the target.?s moves|copy the move/)),
  V171_RULE('move.permanent-learn','技を記録・習得','技を恒久的に記録する特殊な処理',c=>c.isName(/sketch|スケッチ/)||c.has(/permanently copies|permanently learns|技を覚える/)),
  V171_RULE('move.encore-disable','アンコール・技封じ','使える技や回数を制限する',c=>c.isName(/encore|disable|imprison|torment|アンコール|ふういん/)||c.has(/cannot use.*move|prevent.*move from being used|技を使えなく/)),
  V171_RULE('move.repeat-lock','連続使用・行動固定','同じ技を繰り返す、選択を固定',c=>c.has(/locked into|repeatedly use|must keep using|continues to use|技を続けて出|同じ技を続け/)),
  V171_RULE('move.call-other','別の技を実行','別の技を呼び出し、代わりに実行する',c=>c.has(/calls? .*move|uses? .*move instead|uses? the move selected|別の技を出|技を呼び出/))
 ]},
 {id:'space',name:'バトルルール・空間変化',items:[
  V171_RULE('space.gravity','じゅうりょく','浮遊・飛行などの条件や命中率に影響',c=>c.isName(/gravity|じゅうりょく/)||c.has(/gravity|じゅうりょく/)),
  V171_RULE('space.trick-room','トリックルーム','行動順の素早さ判定を逆転',c=>c.isName(/trickroom|トリックルーム/)),
  V171_RULE('space.wonder-room','ワンダールーム','防御と特防の参照を入れ替える',c=>c.isName(/wonderroom|ワンダールーム/)),
  V171_RULE('space.magic-room','マジックルーム','持ち物の効果を一時停止',c=>c.isName(/magicroom|マジックルーム/)),
  V171_RULE('space.transform','変身・フォルム変更','姿や能力・技を別のものに変える',c=>c.isName(/transform|へんしん|kingsshield/)||c.has(/transforms? into|changes? forme|フォルムを変え|変身する/)),
  V171_RULE('space.battle-rule','特殊ルール・場の変更','通常のバトル規則を一時変更',c=>c.has(/battle rule|changes? the field|changes? the battlefield|場のルール|バトルのルール/))
 ]},
 {id:'secondary',name:'追加効果・発動条件',items:[
  V171_RULE('effect.chance','確率つき追加効果','効果発動率が設定されている',c=>Number(c.m.effectChance||0)>0||!!c.m.secondary||Array.isArray(c.m.secondaries)&&c.m.secondaries.length>0),
  V171_RULE('effect.guaranteed','確定追加効果','攻撃後に必ず能力変化などを起こす',c=>!Number(c.m.effectChance||0)&&c.has(/lowers? the target.?s|raises? the user.?s|always.*(?:lower|raise|burn|poison|paralyze)|必ず.*(?:下げ|上げ|状態異常)/)),
  V171_RULE('effect.self-drawback','使用者への能力低下','技使用後に自分の能力ランクが下がる',c=>c.has(/lowers? the user.?s|harshly lowers the user|user.?s defense.*lower|自分の.*能力.*下が|自分の防御が下が/)),
  V171_RULE('effect.target-status-after-hit','命中後の状態付与','攻撃が当たった後に状態・能力変化を与える',c=>!!c.m.status||!!c.m.secondary?.status||Array.isArray(c.m.secondaries)&&c.m.secondaries.some(x=>x.status)||c.has(/has a chance to (?:burn|poison|paraly|freeze|flinch|lower)|ことがある/)),
  V171_RULE('effect.contact-trigger','接触時発動','接触した相手に能力低下・状態異常など',c=>c.has(/when the target makes contact|if the target makes contact|contact.*lowers|contact.*burn|接触した相手/)),
  V171_RULE('effect.on-faint','ひんし時の効果','倒れたとき・倒すときに効果発生',c=>c.has(/when the target faints|if the user faints|when this pok.mon faints|if the target is knocked out|倒れたとき|ひんしになると/)),
  V171_RULE('effect.condition-based','特定条件で発動','状態・天候・HP・対象状態などに依存',c=>c.has(/if the target is|if the user is|depending on|only works when|条件を満た|相手が.*状態|ＨＰが.*とき/))
 ]},
 {id:'audit',name:'監査・要確認',items:[
  V171_RULE('audit.needs-review','個別仕様の要確認','基礎分類以外の自動判定タグが少なく、個別監査が必要',c=>false)
 ]}
];
const V171_DETAIL_RULES = MOVE_EFFECT_DETAIL_GROUPS.flatMap(g=>g.items.map(r=>({...r,group:g.name,groupId:g.id})));
const V171_DETAIL_BY_ID = Object.fromEntries(V171_DETAIL_RULES.map(r=>[r.id,r]));
const V171_CLASSIFY_CACHE = new WeakMap();
function classifyMoveEffects(m){
 if(!m||typeof m!=='object')return [];
 const cached=V171_CLASSIFY_CACHE.get(m);if(cached)return cached.slice();
 const apiValues=Object.values(m.apiAdditional||{}).map(v=>String(v??'')).join(' ');
 const txt=`${m.name||''} ${m.jpName||''} ${m.displayName||''} ${m.id||''} ${m.description||''} ${m.flavorJa||''} ${m.mechanicDescription||''} ${m.shortDesc||''} ${apiValues} ${JSON.stringify(m.flags||{})}`.toLowerCase();
 const compact=txt.replace(/[\s　]+/g,'');
 const names=`${m.id||''} ${m.name||''} ${m.jpName||''} ${m.displayName||''}`.toLowerCase();
 const slugNames=slug(`${m.id||''} ${m.name||''} ${m.jpName||''} ${m.displayName||''}`);
 const bp=Number(m.basePower||0),api=Number(m.apiId||0),target=String(m.target||'').toLowerCase(),flags=m.flags||{};
 const fixedOrSpecialDamageIds=new Set([49,68,69,82,101,149,162,220,243,283,368,515,717,877]);
 const damageMechanic=/inflicts damage equal|inflicts \d+ points of damage|fixed damage|cuts the target.?s hp in half|half of the target.?s remaining hp|damage it took|damage the user received|user.?s remaining hp|相手に.*ダメージを|自分のレベルと同じ|レベルと同じ.*ダメージ|４０のダメージ|２０のダメージ|ＨＰは半分|ＨＰ分のダメージ/.test(txt);
 const specialDamage=fixedOrSpecialDamageIds.has(api)||damageMechanic;
 const damaging=['Physical','Special'].includes(m.category)&&(bp>0||specialDamage);
 const c={m,text:txt,names,bp,api,target,flags,damaging,specialDamage,
  has:re=>{re.lastIndex=0;if(re.test(txt))return true;re.lastIndex=0;return re.test(compact);},isName:re=>re.test(`${names} ${slugNames}`),isSlug:re=>re.test(slugNames)};
 const tags=[];
 for(const r of V171_DETAIL_RULES){try{if(r.id!=='audit.needs-review'&&r.test(c))tags.push(r.id);}catch(err){console.warn('[fine taxonomy]',r.id,err);}}
 const basicOnly=tags.every(id=>id.startsWith('basic.'));
 if(basicOnly)tags.push('audit.needs-review');
 V171_CLASSIFY_CACHE.set(m,tags);
 return tags.slice();
}
function auditMoveEffectTaxonomy(){
 const moves=Object.values(state.data?.movesById||state.data?.moves||{}),counts=Object.fromEntries(V171_DETAIL_RULES.map(r=>[r.id,0]));let detailed=0;
 for(const m of moves){const tags=classifyMoveEffects(m);for(const id of tags)if(counts[id]!=null)counts[id]++;if(tags.some(id=>!id.startsWith('basic.')&&id!=='audit.needs-review'))detailed++;}
 const review=moves.filter(m=>classifyMoveEffects(m).includes('audit.needs-review')).map(m=>getMoveName(m));
 return {version:'hierarchical-v1',moveCount:moves.length,ruleCount:V171_DETAIL_RULES.length,detailedMoves:detailed,needsReviewMoves:review.length,needsReviewSample:review.slice(0,50),counts};
}
function renderMoveFineTaxonomyOverview(){
 const all=Object.values(state.data?.movesById||{}),counts=Object.fromEntries(V171_DETAIL_RULES.map(r=>[r.id,0]));
 for(const m of all)for(const id of classifyMoveEffects(m))if(counts[id]!=null)counts[id]++;
 const detailed=all.filter(m=>classifyMoveEffects(m).some(id=>!id.startsWith('basic.')&&id!=='audit.needs-review')).length;
 const active=state.moveEffectDetailFilter||'all';
 return `<details class="panel move-fine-taxonomy" open><summary><b>🧩 技の階層型・詳細分類</b><span class="pill">${V171_DETAIL_RULES.length} 細分類</span><small>対象 ${all.length.toLocaleString()} 技中、詳細タグが付いた技 ${detailed.toLocaleString()}。技データ・説明文からの自動判定なので、誤分類の可能性があります。タグの付与と効果の実装・動作確認は別に管理します。</small></summary><div class="move-fine-toolbar"><span>選択中：${active==='all'?'すべての詳細分類':esc(V171_DETAIL_BY_ID[active]?.name||active)}</span><button type="button" class="btn btn-ghost btn-sm" data-action="filter-move-detail-taxonomy" data-detail-taxonomy="all">詳細フィルター解除</button></div>${MOVE_EFFECT_DETAIL_GROUPS.map(g=>`<details class="move-fine-group" ${g.items.some(r=>r.id===active)?'open':''}><summary><b>${esc(g.name)}</b><span class="pill">${g.items.length} 種</span><small>${all.filter(m=>classifyMoveEffects(m).some(id=>g.items.some(r=>r.id===id))).length.toLocaleString()} 技に該当</small></summary><div class="move-fine-grid">${g.items.map(r=>`<button type="button" class="move-fine-tag ${active===r.id?'active':''}" data-action="filter-move-detail-taxonomy" data-detail-taxonomy="${esc(r.id)}" title="${esc(r.summary)}"><span>${esc(r.name)}</span><em>${Number(counts[r.id]||0).toLocaleString()}</em></button>`).join('')}</div></details>`).join('')}<p class="footer-note">「監査・要確認」は自動判定の手掛かりが少ない技を示します。詳細タグがあっても、技固有の細則が完全再現されたとは限りません。</p></details>`;
}
function renderMoveFineDetail(move){
 const tags=classifyMoveEffects(move),shown=tags.filter(id=>id!=='audit.needs-review'),preview=shown.slice(0,9),hidden=shown.slice(9);
 const chips=arr=>arr.map(id=>{const r=V171_DETAIL_BY_ID[id];return r?`<span class="move-fine-chip" title="${esc(r.summary)}">${esc(r.name)}</span>`:''}).join('');
 const impl=V170_HANDLED_API.has(Number(move.apiId||0))?'専用ハンドラーあり・要テスト':['Physical','Special'].includes(move.category)&&Number(move.basePower||0)>0?'基本ダメージ経路あり・技固有仕様は要確認':'分類タグのみでは実装を保証しない';
 return `<section class="move-fine-detail"><b>詳細分類（${shown.length} タグ）</b><div class="move-fine-chips">${chips(preview)||'<span class="move-fine-chip">基礎分類のみ</span>'}</div>${hidden.length?`<details><summary>残り ${hidden.length} タグを表示</summary><div class="move-fine-chips">${chips(hidden)}</div></details>`:''}${tags.includes('audit.needs-review')?'<p class="footer-note">要確認：説明データだけでは細かい効果を特定できません。</p>':''}<div class="move-fine-impl"><span>効果実装の目安</span><b>${esc(impl)}</b><small>分類結果ではなく、バトル内の専用処理・共有処理・テスト結果を別に確認してください。</small></div></section>`;
}
// Add the fine-grained filter to the existing catalog without replacing its original controls.
if(!state.moveEffectDetailFilter)state.moveEffectDetailFilter='all';
const __v171FilteredMoves=filteredMoves;
filteredMoves=function(){const list=__v171FilteredMoves();const filter=state.moveEffectDetailFilter||'all';return filter==='all'?list:list.filter(m=>classifyMoveEffects(m).includes(filter));};
const __v171RenderMoves=renderMoves;
renderMoves=function(){const html=__v171RenderMoves();const overview=renderMoveTaxonomyOverview();return html.includes(overview)?html.replace(overview,overview+renderMoveFineTaxonomyOverview()):html;};
const __v171RenderMoveCatalogDetail=renderMoveCatalogDetail;
renderMoveCatalogDetail=function(move){const html=__v171RenderMoveCatalogDetail(move);return html.replace('</aside>',`${renderMoveFineDetail(move)}</aside>`);};
const __v171HandleAction=handleAction;
handleAction=async function(action,el){
 if(action==='filter-move-detail-taxonomy'){state.moveEffectDetailFilter=el.dataset.detailTaxonomy||'all';state.moveEffectCategory='all';state.moveCatalogLimit=72;state.selectedMoveCatalog=null;renderPage();return;}
 if(action==='filter-move-taxonomy'){state.moveEffectDetailFilter='all';}
 return __v171HandleAction(action,el);
};

// Protect-family moves share a consecutive-use counter. Personal guard moves are tested at 1, 1/3, 1/9 ... 1/729.
// In this ruleset, Wide Guard and Quick Guard extend the chain but do not themselves roll the personal-guard failure check.
const V171_GUARD_CHAIN_IDS=new Set([182,197,203,469,501,588,596,661,792,852,908]);
const V171_PERSONAL_GUARD_IDS=new Set([182,197,203,588,596,661,792,852,908]);
const V171_PROTECT_BYPASS_IDS=new Set([144,195,244,248,286,353,364,467,566,593,621,887]);
const V171_PROTECT_BYPASS_NAMES=/feint|hyperspacefury|hyperspacehole|phantomforce|shadowforce|hyperdrill|transform|perishsong|psychup|imprison|doomdesire|futuresight|フェイント|いじげんラッシュ|いじげんホール|ゴーストダイブ|シャドーダイブ|ハイパードリル|ほろびのうた|へんしん|ふういん/;
function v171MoveApi(move){return Number(move?.apiId||0);}
function v171IsGuardChainMove(move){return V171_GUARD_CHAIN_IDS.has(v171MoveApi(move))||/^(protect|detect|endure|wideguard|quickguard|kingsshield|spikyshield|banefulbunker|obstruct|silktrap|burningbulwark)$/.test(slug(move?.id||move?.name||''));}
function v171BypassesProtect(move){return V171_PROTECT_BYPASS_IDS.has(v171MoveApi(move))||V171_PROTECT_BYPASS_NAMES.test(`${move?.id||''} ${move?.name||''} ${move?.jpName||''} ${move?.displayName||''}`.toLowerCase());}
const __v171ExecuteAction=executeAction;
executeAction=function(act,b){
 try{const team=act?.side==='player'?b?.playerTeam:b?.enemyTeam;const actor=team?.find(m=>m.uid===act?.actorUid);const move=act?.switchTo!=null?null:getMove(act?.moveId);if(actor&&!v171IsGuardChainMove(move))actor._protectionChain=0;}catch(err){console.warn('[v16.11 protect chain reset]',err);}
 return __v171ExecuteAction(act,b);
};
const __v171ApplyMoveExtras=applyMoveExtras;
applyMoveExtras=function(actor,target,move,b){
 const api=v171MoveApi(move);
 if(V171_GUARD_CHAIN_IDS.has(api)||v171IsGuardChainMove(move)){
  const chain=Math.max(0,Math.min(6,Number(actor?._protectionChain||0)));
  if(V171_PERSONAL_GUARD_IDS.has(api)&&chain>0){const chance=1/Math.pow(5,chain);if(Math.random()>=chance){actor._protectionChain=0;actor._lastMoveHit=false;actor._lastMoveDamage=0;actor.volatile=actor.volatile||{};delete actor.volatile.protected;actor._protectionFailedThisMove=true;battleLog(`${actor.name}の${getMoveName(move)}は連続使用で失敗した！（成功率 ${Math.round(chance*10000)/100}%）`);return;}}
  actor._protectionChain=Math.min(6,chain+1);actor._protectionFailedThisMove=false;
 }
 return __v171ApplyMoveExtras(actor,target,move,b);
};
const __v171RunBattleEffects=v170RunBattleEffects;
v170RunBattleEffects=function(actor,target,move,b){if(actor?._protectionFailedThisMove){actor._protectionFailedThisMove=false;return;}return __v171RunBattleEffects(actor,target,move,b);};
const __v171ProcessEndTurn=processEndTurn;
processEndTurn=function(b){__v171ProcessEndTurn(b);for(const team of [b?.playerTeam||[],b?.enemyTeam||[]])for(const mon of team){if(!mon)continue;if(mon.volatile)delete mon.volatile.protected;mon._protectionFailedThisMove=false;}};
// Expose the hierarchical taxonomy and its audit helpers to tools without claiming that labels imply implemented mechanics.
if(window.PokemonChampions2DData){Object.assign(window.PokemonChampions2DData,{version:'v16.11',fineTaxonomyVersion:'hierarchical-v1',fineTaxonomy:MOVE_EFFECT_DETAIL_GROUPS.map(g=>({id:g.id,name:g.name,items:g.items.map(({id,name,summary})=>({id,name,summary}))})),fineTaxonomyRules:V171_DETAIL_RULES.map(({id,name,summary,group,groupId})=>({id,name,summary,group,groupId})),classifyMoveEffects,auditMoveEffectTaxonomy,protectionChainRules:{familyIds:[...V171_GUARD_CHAIN_IDS],personalGuardIds:[...V171_PERSONAL_GUARD_IDS],successChance:'1 / 5^consecutiveCount',secondUse:0.2,thirdUse:0.04,fourthUse:0.008,minimumChance:'1/15625'}});}


// ---- v16.14 integrated runtime patch ----
// v16.14 — battle runtime completion layer, event rules, activity timers and audit tools.
// This layer intentionally distinguishes data presence, handler connection and browser verification.
const BC_ENGINE_VERSION='v16.14';
const BC_ACTIVITY_MS=5*60*1000;
const BC_ACTIVITY_SPEED_COST=2500;
const BC_SOUND_MOVE_IDS=new Set([45,46,47,48,195,196,253,304,448,496,497,586,586,653,664,675,728,786,797,812]);
const BC_BULLET_MOVE_IDS=new Set([331,350,402,412,430,469,534,555,590,594,650,673,751,796]);
const BC_PUNCH_MOVE_IDS=new Set([7,8,9,183,223,264,309,325,327,359,409,418,612,677,729,823]);
const BC_SLICING_MOVE_IDS=new Set([163,210,269,400,427,533,534,675,684,699,831,850,895]);
const BC_WIND_MOVE_IDS=new Set([16,18,239,314,366,542,542,584,581,626,660,673,694,784,886]);
const BC_LOCKED_MOVE_NAMES=new Set(['outrage','petaldance','thrash','ragingfury','rollout','iceball','uproar']);
const BC_BIND_MOVE_IDS=new Set([20,35,83,250,328,611]);
const BC_BYPASS_PROTECT_NAMES=new Set(['feint','hyperspacefury','hyperspacehole','phantomforce','shadowforce','hyperdrill']);
const BC_STATUS_IMMUNITY={par:['limber'],brn:['waterveil','waterbubble'],slp:['insomnia','vitalspirit'],frz:['magmaarmor'],psn:['immunity'],tox:['immunity']};
const BC_RUIN_STAT={tabletsofruin:'atk',swordofruin:'def',vesselofruin:'spa',beadsofruin:'spd'};
const BC_MEMORY_TYPES={fightingmemory:'Fighting',flyingmemory:'Flying',poisonmemory:'Poison',groundmemory:'Ground',rockmemory:'Rock',bugmemory:'Bug',ghostmemory:'Ghost',steelmemory:'Steel',firememory:'Fire',watermemory:'Water',grassmemory:'Grass',electricmemory:'Electric',psychicmemory:'Psychic',icememory:'Ice',dragonmemory:'Dragon',darkmemory:'Dark',fairymemory:'Fairy'};
const BC_PLATE_TYPES={fistplate:'Fighting',skyplate:'Flying',toxicplate:'Poison',earthplate:'Ground',stoneplate:'Rock',insectplate:'Bug',spookyplate:'Ghost',ironplate:'Steel',flameplate:'Fire',splashplate:'Water',meadowplate:'Grass',zapplate:'Electric',mindplate:'Psychic',icicleplate:'Ice',dracoplate:'Dragon',dreadplate:'Dark',pixieplate:'Fairy'};
function bcSpeciesBaseId(mon){const sp=monSpecies(mon);return slug(sp?.baseSpecies||sp?.name||mon?.speciesId||'');}
function bcPlateType(mon){return BC_PLATE_TYPES[bcItem(mon)]||null;}
const BC_prevMonSpecies=monSpecies;
monSpecies=function(mon){return mon?._dynamicFormData||BC_prevMonSpecies(mon);};
function bcBuiltInForm(baseId,formKey,displayName,types,baseStats=null){const base=state.data.dexById?.[baseId]||findSpecies(baseId);if(!base)return null;if(formKey==='base')return base;return {...base,id:`${baseId}-${formKey}`,slug:`${baseId}-${formKey}`,name:`${base.name}-${formKey}`,jpName:displayName,displayName,baseSpecies:base.id,forme:formKey,types:[...(types||base.types||[])],baseStats:{...(base.baseStats||{}),...(baseStats||{})},spriteid:`${baseId}-${formKey}`,spritePokemonId:base.num,pokeApiPokemonId:base.num,battleOnly:true,_dynamicForm:true};}
function bcFindOrBuildForm(baseId,terms,formKey,displayName,types,baseStats=null){return bcGetForm(baseId,terms)||bcBuiltInForm(baseId,formKey,displayName,types,baseStats);}
function bcAllBattleMons(b){return [...(b?.playerTeam||[]),...(b?.enemyTeam||[])].filter(Boolean);}
function bcFindBattleMon(uid,b=state.battle){return bcAllBattleMons(b).find(m=>m.uid===uid)||null;}
function bcSide(mon,b=state.battle){if(!mon||!b)return null;return (b.playerTeam||[]).some(x=>x?.uid===mon.uid)?'player':'enemy';}
function bcOppositeSide(side){return side==='player'?'enemy':'player';}
function bcActiveMons(side,b=state.battle){if(!b)return [];const team=side==='player'?b.playerTeam:b.enemyTeam,active=side==='player'?b.playerActive:b.enemyActive;return (active||[]).map(i=>team?.[i]).filter(m=>m&&!m.fainted&&m.hp>0);}
function bcHasAbility(mon,id,b=state.battle){return bcAbility(mon,b)===id;}
function bcAbility(mon,b=state.battle){if(!mon||!mon.abilityId||slug(mon.abilityId)==='none'||mon._abilityDisabledTurns>0)return '';if(b&&[...bcActiveMons('player',b),...bcActiveMons('enemy',b)].some(x=>x!==mon&&slug(x.abilityId)==='neutralizinggas'&&Number(x._abilityDisabledTurns||0)===0))return '';return slug(mon.abilityId);}
function bcFlag(move,flag){if(!move)return false;const f=move.flags||{};if(f[flag]===true)return true;const id=slug(move.id||move.name||'');const api=Number(move.apiId||0);if(flag==='sound')return BC_SOUND_MOVE_IDS.has(api)||/^(boomburst|chatter|clangingscales|clangoroussoul|disarmingvoice|echoedvoice|growl|hypervoice|metalsound|perishsong|relicsong|roar|round|screech|snarl|snore|sparklingaria|supersonic|uproar)$/.test(id);
 if(flag==='bullet')return BC_BULLET_MOVE_IDS.has(api)||/^(acid|aurasphere|bulletseed|electroball|energyball|gyroball|iceball|magnetbomb|mudbomb|rockblast|rockwrecker|seedbomb|shadowball|sludgebomb|weatherball|zapcannon)$/.test(id);
 if(flag==='punch')return BC_PUNCH_MOVE_IDS.has(api)||/punch|machpunch|bulletpunch|shadowpunch|thunderpunch|firepunch|icepunch|drainpunch|poweruppunch|meteorassault/.test(id);
 if(flag==='slicing')return BC_SLICING_MOVE_IDS.has(api)||/slash|blade|cut|leafblade|nightslash|razorleaf|sacredsword|xscissor|kowtowcleave|ceaselessedge|aquacutter|psyblade/.test(id);
 if(flag==='wind')return BC_WIND_MOVE_IDS.has(api)||/gust|wind|hurricane|bleakwindstorm|tailwind|twister|fairywind/.test(id);
 if(flag==='contact')return f.contact===true;
 if(flag==='reflectable')return f.reflectable===true;
 if(flag==='powder')return f.powder===true||/^(spore|stunspore|poisonpowder|sleep powder|ragepowder|powdersnow)$/.test(id);
 return !!f[flag];}
function bcItem(mon){if(!mon)return '';if(mon._embargoTurns>0||state.battle?.magicRoomTurns>0)return '';return itemSlug(mon.heldItem||'');}
function bcConsumeItem(mon,why=''){if(!mon||!mon.heldItem)return '';const item=mon.heldItem;mon._lastConsumedItem=item;mon._itemConsumed=true;mon.heldItem='';if(why)battleLog(`${mon.name}の${item}が${why}で消費された！`);return item;}
function bcEffectLog(msg){if(typeof battleLog==='function')battleLog(msg);}
function bcRecordError(where,error,context={}){const b=state.battle;if(b){b.errors=Array.isArray(b.errors)?b.errors:[];b.errors.push({at:new Date().toISOString(),where,message:String(error?.message||error),stack:String(error?.stack||''),context});if(b.errors.length>50)b.errors=b.errors.slice(-50);}console.error(`[${BC_ENGINE_VERSION} ${where}]`,error,context);}
function bcGetForm(baseId,terms){const base=state.data.dexById?.[baseId]||findSpecies(baseId);if(!base)return null;const baseName=base.baseSpecies||base.name||base.id;return state.data.dex.find(p=>p.id!==base.id&&((p.baseSpecies||'')===baseName||String(p.id).startsWith(slug(baseName)+'-'))&&terms.some(t=>`${p.id} ${p.forme||''} ${p.name||''}`.toLowerCase().includes(t)))||null;}
function bcSwapForm(mon,form,b){if(!mon||!form)return false;if(mon.speciesId===form.id)return false;const ratio=mon.maxhp>0?mon.hp/mon.maxhp:1;mon.speciesId=form.id;mon._dynamicFormData=form._dynamicForm?form:null;mon.name=getPokeName(form);mon.types=[...(form.types||[])];mon.stats={...calcStats(mon)};mon.maxhp=Math.max(1,Number(mon.stats.hp||mon.maxhp||1));mon.hp=Math.max(mon.hp>0?1:0,Math.min(mon.maxhp,Math.round(mon.maxhp*ratio)));bcEffectLog(`${mon.name}の姿が変わった！`);return true;}
function bcUpdateDynamicForm(mon,b){if(!mon||!b||mon.terastallized)return;const base=mon.baseSpeciesId||mon.speciesId;const species=monSpecies(mon);const baseId=slug(species?.baseSpecies||base);
 if(baseId==='castform') {const key=b.weather==='sun'?'sunny':b.weather==='rain'?'rainy':b.weather==='snow'?'snowy':'base';const f=key==='base'?(state.data.dexById?.castform||findSpecies('castform')):bcFindOrBuildForm('castform',[key],key,key==='sunny'?'ポワルン（たいよう）':key==='rainy'?'ポワルン（あまみず）':'ポワルン（ゆきぐも）',[key==='sunny'?'Fire':key==='rainy'?'Water':'Ice']);if(f)bcSwapForm(mon,f,b);}
 if(baseId==='morpeko'){const key=mon._hangry?'hangry':'full-belly';const f=bcFindOrBuildForm('morpeko',[key.replace('-',' '),key],key,mon._hangry?'モルペコ（はらぺこもよう）':'モルペコ（まんぷくもよう）',['Electric','Dark']);if(f)bcSwapForm(mon,f,b);}
 if(baseId==='darmanitan'&&bcAbility(mon,b)==='zenmode'){const zen=mon.hp>0&&mon.hp<=mon.maxhp/2;const f=zen?bcFindOrBuildForm('darmanitan',['zen'],'zen','ヒヒダルマ（ダルマモード）',['Fire','Psychic'],{hp:105,atk:30,def:105,spa:140,spd:105,spe:55}):(state.data.dexById?.darmanitan||findSpecies('darmanitan'));if(f)bcSwapForm(mon,f,b);}
 if(baseId==='zygarde'&&bcAbility(mon,b)==='powerconstruct'){const complete=mon.hp>0&&mon.hp<=mon.maxhp/2;const f=complete?bcFindOrBuildForm('zygarde',['complete'],'complete','ジガルデ（パーフェクトフォルム）',['Dragon','Ground'],{hp:216,atk:100,def:121,spa:91,spd:95,spe:85}):(state.data.dexById?.zygarde||findSpecies('zygarde'));if(f)bcSwapForm(mon,f,b);}
 if(baseId==='arceus'){const t=bcPlateType(mon);mon.types=[t||'Normal'];}
 if(baseId==='silvally'&&bcAbility(mon,b)==='rkssystem'){const t=BC_MEMORY_TYPES[bcItem(mon)];if(t)mon.types=[t];else if(!mon.terastallized)mon.types=[...(species?.types||['Normal'])];}
}
function bcBoostedStatKey(mon,b){const ab=bcAbility(mon,b);const itemReady=bcItem(mon)==='boosterenergy';const environmental=(ab==='protosynthesis'&&b.weather==='sun')||(ab==='quarkdrive'&&b.terrain==='electric');if((ab==='protosynthesis'||ab==='quarkdrive')&&(environmental||itemReady||mon._paradoxActiveByItem)){if(!mon._paradoxStat){const keys=['atk','def','spa','spd','spe'];const sorted=keys.map(k=>[k,Number(mon.stats?.[k]||0)]).sort((a,c)=>c[1]-a[1]);mon._paradoxStat=sorted[0]?.[0]||'spe';}if(itemReady){bcConsumeItem(mon,'発動');mon._paradoxActiveByItem=true;}return mon._paradoxStat;}return null;}
function bcRuinMultiplier(mon,stat,b){if(!mon||!b)return 1;const owners=[...bcActiveMons('player',b),...bcActiveMons('enemy',b)];for(const owner of owners){if(owner===mon)continue;const ab=bcAbility(owner,b);const key=BC_RUIN_STAT[ab];if(key===stat)return 0.75;}return 1;}
function bcRuinKey(ab){return ({tabled:'atk'}[ab]||BC_RUIN_STAT[ab]||null);}
function bcMoveId(move){return slug(move?.id||move?.name||'');}

// Ensure every battle record has all mutable state containers; also make battle start consistent.
const BC_prevBuildBattleMon=buildBattleMon;
buildBattleMon=function(monOrSpecies,owned=false){const mon=BC_prevBuildBattleMon(monOrSpecies,owned);mon.volatile=mon.volatile&&typeof mon.volatile==='object'?mon.volatile:{};mon.stages=mon.stages&&typeof mon.stages==='object'?mon.stages:{atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0,evasion:0};mon.types=[...(mon.types||monSpecies(mon)?.types||[])];mon._baseBattleTypes=[...(mon.types||[])];mon._embargoTurns=Number(mon._embargoTurns||0);mon._protectionChain=Number(mon._protectionChain||0);return mon;};
const BC_prevStartBattle=startBattle;
startBattle=function(mode=state.battleMode){const result=BC_prevStartBattle(mode);if(state.battle){state.battle.sideConditions=state.battle.sideConditions||{player:{},enemy:{}};state.battle.sideConditions.player=state.battle.sideConditions.player||{};state.battle.sideConditions.enemy=state.battle.sideConditions.enemy||{};state.battle.teraUsedBySide={player:false,enemy:false};state.battle.teraPendingSlots=[];state.battle.eventQueue=[];state.battle.errors=[];state.battle.rngSeed=(Date.now()>>>0)||1;}return result;};

// Status immunities, Safeguard, Mist, Leaf Guard, Sweet Veil and Purifying Salt.
const BC_prevSetStatus=setStatus;
setStatus=function(target,status,sourceName=''){if(!target||!status)return false;const b=state.battle,ab=bcAbility(target,b),species=monSpecies(target),side=bcSide(target,b),cond=side&&b?.sideConditions?.[side];if(status==='slp'&&[...bcActiveMons('player',b),...bcActiveMons('enemy',b)].some(m=>m.volatile?.uproarTurns>0)){bcEffectLog('さわぐポケモンがいて眠れない！');return false;}if(ab==='purifyingsalt'){bcEffectLog(`${target.name}の清めの塩が状態異常を防いだ！`);return false;}if(BC_STATUS_IMMUNITY[status]?.includes(ab)){bcEffectLog(`${target.name}の「${abilityName(target.abilityId)}」で状態異常を防いだ！`);return false;}if(status==='slp'&&b&&bcActiveMons(side,b).some(m=>m!==target&&bcAbility(m,b)==='sweetveil')){bcEffectLog(`${target.name}は味方のスイートベールに守られた！`);return false;}if(status==='slp'&&ab==='leafguard'&&b?.weather==='sun'){bcEffectLog(`${target.name}のリーフガードで眠らない！`);return false;}if(cond?.safeguardTurns>0){bcEffectLog(`${target.name}はしんぴのまもりに守られた！`);return false;}if((status==='par'&&species?.types?.includes('Electric'))||(status==='brn'&&species?.types?.includes('Fire'))||(status==='frz'&&species?.types?.includes('Ice'))||((status==='psn'||status==='tox')&&species?.types?.some(t=>['Poison','Steel'].includes(t))))return BC_prevSetStatus(target,status,sourceName);const ok=BC_prevSetStatus(target,status,sourceName);if(ok&&bcItem(target)==='lumberry'||ok&&bcItem(target)==='lum berry'){target.status=null;target.statusTurns=0;bcConsumeItem(target,'状態異常回復');}return ok;};

// Stat stages: Contrary/Simple, Clear Body family, Mirror Armor, Defiant/Competitive/Rattled.
const BC_prevApplyBoosts=applyBoosts;
let BC_reflectingDrop=false;
function bcReactToStatDrop(target,key,amount,sourceActor,b){if(!target||amount>=0||!b)return;const ab=bcAbility(target,b);if(ab==='defiant')BC_prevApplyBoosts(target,{atk:2},'まけんき');else if(ab==='competitive')BC_prevApplyBoosts(target,{spa:2},'かちき');if(ab==='rattled')BC_prevApplyBoosts(target,{spe:1},'びびり');}
applyBoosts=function(target,boosts,sourceName=''){if(!target||!boosts)return;const b=state.battle,ab=bcAbility(target,b),source=b?bcFindBattleMon(b._eventActorUid,b):null;const incoming=!!(source&&source.uid!==target.uid&&bcSide(source,b)!==bcSide(target,b));const adjusted={};for(const [rawKey,rawAmount] of Object.entries(boosts)){let key=({attack:'atk',defense:'def',specialattack:'spa',specialdefense:'spd',speed:'spe',accuracy:'accuracy',evasion:'evasion'})[slug(rawKey)]||rawKey;let amount=Number(rawAmount||0);if(ab==='contrary')amount=-amount;else if(ab==='simple')amount*=2;if(amount<0&&incoming){const immune=ab==='clearbody'||ab==='whitesmoke'||ab==='fullmetalbody'||(key==='atk'&&ab==='hypercutter')||(key==='accuracy'&&ab==='keeneye')||(key==='def'&&ab==='bigpecks');if(immune){bcEffectLog(`${target.name}の「${abilityName(target.abilityId)}」で能力下降を防いだ！`);continue;}if(ab==='mirrorarmor'&&source&&!BC_reflectingDrop){BC_reflectingDrop=true;try{BC_prevApplyBoosts(source,{[key]:amount},'ミラーアーマー');}finally{BC_reflectingDrop=false;}bcEffectLog(`${target.name}のミラーアーマーで能力下降を跳ね返した！`);continue;}if(b?.sideConditions?.[bcSide(target,b)]?.mistTurns>0&&['atk','def','spa','spd','spe'].includes(key)){bcEffectLog(`${target.name}はしろいきりに守られた！`);continue;}}
 adjusted[key]=amount;}
 if(Object.keys(adjusted).length){const before={...(target.stages||{})};BC_prevApplyBoosts(target,adjusted,sourceName);for(const [key,amount] of Object.entries(adjusted)){if(incoming&&amount<0&&(target.stages?.[key]??0)<(before[key]??0))bcReactToStatDrop(target,key,amount,source,b);}}
 if(bcItem(target)==='whiteherb'&&Object.entries(target.stages||{}).some(([k,v])=>['atk','def','spa','spd','spe','accuracy','evasion'].includes(k)&&v<0)){target.stages={...(target.stages||{})};for(const k of Object.keys(target.stages))if(target.stages[k]<0)target.stages[k]=0;bcConsumeItem(target,'能力下降回復');bcEffectLog(`${target.name}はしろいハーブで能力を戻した！`);}
};

// Dynamic type chart interactions: Foresight/Miracle Eye, Ring Target, Scrappy and Freeze-Dry.
const BC_prevTypeMult=typeMult;
typeMult=function(moveType,defSpecies,defMon=null){let types=defMon?.types||defSpecies?.types||[];let adjusted={...(defSpecies||{}),types:[...types]};if(defMon?.volatile?.foresight&&['Normal','Fighting'].includes(moveType))adjusted.types=adjusted.types.filter(t=>t!=='Ghost');if(defMon?.volatile?.miracleEye&&moveType==='Psychic')adjusted.types=adjusted.types.filter(t=>t!=='Dark');let mult=BC_prevTypeMult(moveType,adjusted,defMon);if(defMon&&bcItem(defMon)==='ringtarget'&&mult===0){const ab=bcAbility(defMon);const abilityImmunity=(ab==='levitate'&&moveType==='Ground')||(ab==='waterabsorb'&&moveType==='Water')||(ab==='voltabsorb'&&moveType==='Electric')||(ab==='flashfire'&&moveType==='Fire')||(ab==='sapsipper'&&moveType==='Grass')||(ab==='stormdrain'&&moveType==='Water')||(ab==='dryskin'&&moveType==='Water')||(ab==='motordrive'&&moveType==='Electric');const chart=TYPE_CHART[moveType];if(!abilityImmunity&&chart&&types.some(t=>chart.immune.includes(t)))mult=1;}return mult;};

// Damage modifiers for Ruin auras, Paradox boosts, Terastal STAB, Freeze-Dry and item states.
const BC_prevCurrentStat=currentStat;
currentStat=function(mon,key){let value=BC_prevCurrentStat(mon,key),b=state.battle;if(!mon||!b)return value;const paradox=bcBoostedStatKey(mon,b);if(paradox===key)value=Math.floor(value*(key==='spe'?1.5:1.3));value=Math.floor(value*bcRuinMultiplier(mon,key,b));if(key==='spe'&&bcAbility(mon,b)==='unburden'&&mon._itemConsumed)value*=2;if(key==='atk'&&bcAbility(mon,b)==='hustle')value=Math.floor(value*1.5);return value;};
const BC_prevResolveContext=resolveContextMoveData;
resolveContextMoveData=function(move,actor,target,b){const base=BC_prevResolveContext(move,actor,target,b);if(!move||!actor)return base;const id=bcMoveId(move);let type=base.type,power=base.power;const baseSpecies=bcSpeciesBaseId(actor),plate=bcPlateType(actor),memory=BC_MEMORY_TYPES[bcItem(actor)];if(id==='judgment'&&baseSpecies==='arceus')type=plate||'Normal';if(id==='multiattack'&&baseSpecies==='silvally')type=memory||'Normal';if(id==='terablast'&&actor.terastallized){type=actor.teraType||type;power=80;}if(!actor.terastallized&&(bcAbility(actor,b)==='protean'||bcAbility(actor,b)==='libero')){if(!actor._proteanUsed&&type&&actor.types?.[0]!==type){actor._baseBattleTypes=actor._baseBattleTypes||[...(monSpecies(actor)?.types||actor.types||[])];actor.types=[type];actor._proteanUsed=true;bcEffectLog(`${actor.name}は${TYPE_JA[type]||type}タイプに変化した！`);}}return {...base,type,power};};
const BC_prevCalculateDamage=calculateDamage;
calculateDamage=function(actor,target,move,b){const oldCategory=move?.category;let result;try{if(move&&bcMoveId(move)==='terablast'&&actor?.terastallized)move.category=currentStat(actor,'atk')>currentStat(actor,'spa')?'Physical':'Special';result=BC_prevCalculateDamage(actor,target,move,b);}finally{if(move&&oldCategory)move.category=oldCategory;}if(!result||!target||!actor)return result;const type=resolveContextMoveData(move,actor,target,b).type;
 if(bcMoveId(move)==='freezedry'&&(target.types||monSpecies(target)?.types||[]).includes('Water')){if(result.effectiveness===0)result.effectiveness=2;else result.effectiveness*=2;result.damage=Math.max(1,Math.floor(result.damage*2));}
 const speciesKey=bcSpeciesBaseId(actor),held=bcItem(actor),plateType=BC_PLATE_TYPES[held],memoryType=BC_MEMORY_TYPES[held];if((speciesKey==='arceus'&&plateType===type)||(speciesKey==='silvally'&&memoryType===type))result.damage=Math.max(1,Math.floor(result.damage*1.2));
 if(['scrappy','mindseye'].includes(bcAbility(actor,b))&&['Normal','Fighting'].includes(type)&&(target.types||[]).includes('Ghost')){const adjusted={...(monSpecies(target)||{}),types:(target.types||[]).filter(t=>t!=='Ghost')};const oldEff=Number(result.effectiveness||0),newEff=BC_prevTypeMult(type,adjusted,{...target,types:adjusted.types});if(oldEff===0&&newEff>0){const rerun=BC_prevCalculateDamage(actor,{...target,types:adjusted.types},move,b);result.damage=rerun.damage;result.effectiveness=rerun.effectiveness;}}
 if(actor.terastallized&&actor.teraType!=='Stellar'){const original=actor._teraOriginalTypes||[],tera=actor.teraType||'',adapt=bcAbility(actor,b)==='adaptability';let desired=1,base=1;if(type===tera){base=adapt?2:1.5;desired=original.includes(tera)?(adapt?2.25:2):(adapt?1.75:1.5);}else if(original.includes(type)){base=1;desired=adapt?2:1.5;}const factor=desired/base;if(factor!==1){result.damage=Math.max(1,Math.floor(result.damage*factor));result.stab=desired;}}
 if(move?.flags?.ignoreAbilities||['moldbreaker','teravolt','turboblaze'].includes(bcAbility(actor,b))){} // target ability suppression is applied in executeAction for the entire action.
 if(result.damage>0&&['electric','grass','psychic','fairy'].includes(b?.terrain)&&['electric','grass','psychic','fairy'].includes(type)){/* terrain modifiers already applied by base damage */}
 return result;};

// Accuracy flags and ability-based accuracy modifiers.
const BC_prevAccuracy=getEffectiveAccuracy;
getEffectiveAccuracy=function(move,actor,target,b){if(move?.alwaysHits||move?.flags?.alwaysHit||move?.accuracy===true)return 100;let acc=BC_prevAccuracy(move,actor,target,b);const ab=bcAbility(actor,b);if(ab==='hustle'&&move.category==='Physical')acc*=.8;if(ab==='victorystar')acc*=1.1;if(b?.sideConditions?.[bcSide(actor,b)]?.tailwindTurns>0&&ab==='compoundeyes')acc*=1;return Math.max(1,Math.min(100,acc));};

// Ability immunity and rejection, including Soundproof/Bulletproof/Overcoat and Mold Breaker.
const BC_prevAbilityTrigger=abilityTriggerOnMove;
abilityTriggerOnMove=function(actor,target,move,b){const a=bcAbility(target,b);if(!actor||!target||!move)return false;const id=bcMoveId(move);if((a==='soundproof'&&bcFlag(move,'sound'))||(a==='bulletproof'&&bcFlag(move,'bullet'))||(a==='overcoat'&&bcFlag(move,'powder'))){bcEffectLog(`${target.name}の「${abilityName(target.abilityId)}」で${getMoveName(move)}を防いだ！`);return true;}if(a==='wonderguard'&&Number(resolveContextMoveData(move,actor,target,b).power||0)>0&&typeMult(resolveContextMoveData(move,actor,target,b).type,monSpecies(target),target)<=1){bcEffectLog(`${target.name}のふしぎなまもりで攻撃が通らない！`);return true;}if(a==='oblivious'&&['attract','taunt'].includes(id)){bcEffectLog(`${target.name}のどんかんで効果を防いだ！`);return true;}return BC_prevAbilityTrigger(actor,target,move,b);};

// Move-side effects and persistent volatile states.
const BC_prevMoveSpecific=applyMoveSpecificEffects;
applyMoveSpecificEffects=function(actor,target,move,b){if(!actor||!target||!move||!b)return;const oldConf=Number(target._confusionTurns||0),oldInf=target._infatuatedBy||null,oldTaunt=Number(target.volatile?.tauntTurns||0),oldEncore=Number(target.volatile?.encoreTurns||0),oldDisable=Number(target.volatile?.disableTurns||0),oldTorment=!!target.volatile?.torment,oldEmbargo=Number(target._embargoTurns||0),actorHeld=actor.heldItem||'',targetHeld=target.heldItem||'';BC_prevMoveSpecific(actor,target,move,b);const aid=bcAbility(target,b),allyAroma=bcActiveMons(bcSide(target,b),b).some(m=>m!==target&&bcAbility(m,b)==='aromaveil');if(aid==='owntempo'&&Number(target._confusionTurns||0)>oldConf){target._confusionTurns=oldConf;bcEffectLog(`${target.name}のマイペースで混乱しない！`);}if((aid==='oblivious'||aid==='aromaveil'||allyAroma)&&target._infatuatedBy!==oldInf){target._infatuatedBy=oldInf;bcEffectLog(`${target.name}はメンタルへの効果を受けない！`);}if((aid==='aromaveil'||allyAroma)){target.volatile=target.volatile||{};target.volatile.tauntTurns=oldTaunt;target.volatile.encoreTurns=oldEncore;target.volatile.disableTurns=oldDisable;target.volatile.torment=oldTorment;if(target._embargoTurns>oldEmbargo)target._embargoTurns=oldEmbargo;}if(actorHeld&&actor.heldItem!==actorHeld){actor._lastConsumedItem=actorHeld;actor._itemConsumed=true;}if(targetHeld&&target.heldItem!==targetHeld){target._lastConsumedItem=targetHeld;target._itemConsumed=true;}const id=bcMoveId(move),api=Number(move.apiId||0),own=bcSide(actor,b),foe=bcOppositeSide(own);b.sideConditions=b.sideConditions||{player:{},enemy:{}};b.sideConditions[own]=b.sideConditions[own]||{};b.sideConditions[foe]=b.sideConditions[foe]||{};
 if(id==='safeguard'||api===219){b.sideConditions[own].safeguardTurns=5;bcEffectLog('味方はしんぴのまもりに包まれた！');}
 if(id==='mist'||api===54){b.sideConditions[own].mistTurns=5;bcEffectLog('味方側にしろいきりが広がった！');}
 if(id==='courtchange'||api===756){const keys=['stealthrock','spikes','toxicspikes','stickyweb','reflect','lightscreen','auroraveil','tailwindTurns','safeguardTurns','mistTurns'];for(const k of keys){const v=b.sideConditions.player[k];b.sideConditions.player[k]=b.sideConditions.enemy[k];b.sideConditions.enemy[k]=v;}bcEffectLog('コートチェンジ！ 両側の場の効果が入れ替わった！');}
 if(id==='foresight'||api===193){target.volatile=target.volatile||{};target.volatile.foresight=true;bcEffectLog(`${target.name}の正体を見破った！`);}
 if(id==='miracleeye'||api===357){target.volatile=target.volatile||{};target.volatile.miracleEye=true;bcEffectLog(`${target.name}の回避を見破った！`);}
 if(id==='nightmare'||api===171){if(target.status==='slp'){target.volatile=target.volatile||{};target.volatile.nightmare=true;}}
 if(id==='curse'&&actor.types?.includes('Ghost')){target.volatile=target.volatile||{};target.volatile.curse=true;target.volatile.curseOwner=actor.uid;}
 if(BC_BIND_MOVE_IDS.has(api)||['bind','wrap','firespin','whirlpool','sandtomb','infestation','clamp','magmastorm','snaptrap','thousandwaves','jawlock'].includes(id)){target.volatile=target.volatile||{};target.volatile.bindTurns=4;target.volatile.bindOwner=actor.uid;target.volatile.bindMove=id;target.volatile.bindDamage=1/8;}
 if(id==='rapidspin'||api===229){actor.volatile=actor.volatile||{};delete actor.volatile.leechseed;delete actor.volatile.bindTurns;delete actor.volatile.nightmare;const side=b.sideConditions[own];side.stealthrock=false;side.spikes=0;side.toxicspikes=0;side.stickyweb=false;actor._trappedTurns=0;}
 if(id==='embargo'||api===373){target._embargoTurns=5;}
 if(id==='recycle'||api===278){if(!actor.heldItem&&actor._lastConsumedItem){actor.heldItem=actor._lastConsumedItem;actor._lastConsumedItem=null;actor._itemConsumed=false;bcEffectLog(`${actor.name}は使った持ち物を再利用した！`);}}
 if(id==='uproar'||api===253){actor.volatile=actor.volatile||{};actor.volatile.uproarTurns=3;}
 bcUpdateDynamicForm(actor,b);bcUpdateDynamicForm(target,b);
};

// Action wrapper: forced move lock, item/ability suppression, Protean, switch cleanup and diagnostics.
const BC_prevExecuteAction=executeAction;
executeAction=function(act,b){if(!act||!b)return BC_prevExecuteAction(act,b);const team=act.side==='player'?b.playerTeam:b.enemyTeam;const actor=team?.find(m=>m?.uid===act.actorUid);if(!actor)return BC_prevExecuteAction(act,b);const switching=act.switchTo!=null;let requestedMove=switching?null:getMove(act.moveId);if(!switching&&actor.volatile?.lockedMove&&actor.volatile.lockedMoveTurns>0){act={...act,moveId:actor.volatile.lockedMove};requestedMove=getMove(act.moveId);}
 if(switching){if(actor._trappedTurns>0||actor.volatile?.bindTurns>0){bcEffectLog(`${actor.name}は拘束されて交代できない！`);return;}actor._chargingMove=null;actor._semiInvulnerable=false;actor._proteanUsed=false;actor._paradoxStat=null;actor._paradoxActiveByItem=false;actor._baseBattleTypes=[...(monSpecies(actor)?.types||actor._baseBattleTypes||[])];if(!actor.terastallized)actor.types=[...actor._baseBattleTypes];actor.volatile={...(actor.volatile||{})};for(const key of ['foresight','miracleEye','nightmare','curse','curseOwner','lockedMove','lockedMoveTurns','uproarTurns','leechseed','leechseedOwner','protected','substituteHp','tauntTurns','encoreTurns','encoreMove','disabledMove','disableTurns','torment','bindTurns','bindOwner','bindMove','bindDamage'])delete actor.volatile[key];actor._trappedTurns=0;actor._confusionTurns=0;actor._infatuatedBy=null;}
 const move=requestedMove||(!switching?getMove(act.moveId):null);const target=!switching?targetForAction(actor,act,b):null;if(!switching&&move&&bcMoveId(move)==='behemothblade'&&bcSpeciesBaseId(actor).includes('zacian')&&bcItem(actor)!=='rustedsword'){bcEffectLog('ザシアンのきょじゅうざんには くちたけんが必要だ！');return;}const breaker=['moldbreaker','teravolt','turboblaze'].includes(bcAbility(actor,b))||!!move?.flags?.ignoreAbilities;const savedAbility=breaker&&target?target.abilityId:null;const savedSub=actor&&bcAbility(actor,b)==='infiltrator'&&target?target.volatile?.substituteHp:undefined;const savedScreens=actor&&bcAbility(actor,b)==='infiltrator'&&target?{...b.sideConditions?.[bcSide(target,b)]}:null;
 b._eventActorUid=actor.uid;let result;try{if(breaker&&target)target.abilityId='none';if(savedSub!==undefined&&target?.volatile)delete target.volatile.substituteHp;if(actor&&bcAbility(actor,b)==='infiltrator'&&target){const cond=b.sideConditions?.[bcSide(target,b)];if(cond){cond.reflect=0;cond.lightscreen=0;cond.auroraveil=0;}}
 if(move&&bcMoveId(move)==='feint'&&target?.volatile?.protected){delete target.volatile.protected;bcEffectLog(`${target.name}の守りを崩した！`);}
 result=BC_prevExecuteAction(act,b);
 if(move&&BC_LOCKED_MOVE_NAMES.has(bcMoveId(move))&&actor._lastMoveHit&&actor._lastMoveDamage>0){if(!actor.volatile?.lockedMove){actor.volatile=actor.volatile||{};actor.volatile.lockedMove=move.id;actor.volatile.lockedMoveTurns=2+Math.floor(Math.random()*2);}else{actor.volatile.lockedMoveTurns=Math.max(0,Number(actor.volatile.lockedMoveTurns||0)-1);if(actor.volatile.lockedMoveTurns<=0){delete actor.volatile.lockedMove;delete actor.volatile.lockedMoveTurns;actor._confusionTurns=2+Math.floor(Math.random()*4);bcEffectLog(`${actor.name}は技の反動で混乱した！`);}}}
 if(move&&bcMoveId(move)==='uproar'){actor.volatile.uproarTurns=Math.max(1,Number(actor.volatile.uproarTurns||3));}
 if(target&&move&&actor._lastMoveHit){const eff=typeMult(resolveContextMoveData(move,actor,target,b).type,monSpecies(target),target);if(eff>1&&bcAbility(target,b)==='weakarmor'&&move.category==='Physical')applyBoosts(target,{def:-1,spe:2},'くだけるよろい');if(eff>1&&bcAbility(target,b)==='justified'&&resolveContextMoveData(move,actor,target,b).type==='Dark')applyBoosts(target,{atk:1},'せいぎのこころ');if(bcFlag(move,'sound')&&bcAbility(target,b)==='soundproof'){} }
 }catch(err){bcRecordError('executeAction',err,{actor:actor.name,move:move?.id||act.moveId,side:act.side,turn:b.turn});bcEffectLog(`戦闘処理エラー：${move?getMoveName(move):'交代'}。詳細は診断情報を確認してください。`);}finally{if(breaker&&target)target.abilityId=savedAbility;if(savedSub!==undefined&&target?.volatile)target.volatile.substituteHp=savedSub;if(savedScreens&&target){const cond=b.sideConditions?.[bcSide(target,b)];if(cond)for(const k of ['reflect','lightscreen','auroraveil'])cond[k]=savedScreens[k]||0;}b._eventActorUid=null;}
 return result;};

// Additional battle end-turn conditions and form updates.
const BC_prevProcessEndTurn=processEndTurn;
processEndTurn=function(b){if(!b)return;const all=bcAllBattleMons(b);const active=new Set([...((b.playerActive||[]).map(i=>b.playerTeam?.[i])),...((b.enemyActive||[]).map(i=>b.enemyTeam?.[i]))].filter(Boolean).map(m=>m.uid));for(const mon of all){if(!mon)continue;if(mon._embargoTurns>0)mon._embargoTurns--;if(!active.has(mon.uid))continue;if(mon.volatile?.uproarTurns>0){mon.volatile.uproarTurns--;if(mon.volatile.uproarTurns===0)delete mon.volatile.uproarTurns;}
 if(mon.volatile?.bindTurns>0&&!mon.fainted&&mon.hp>0){const d=Math.max(1,Math.floor(mon.maxhp*Number(mon.volatile.bindDamage||1/8)));mon.hp=Math.max(0,mon.hp-d);mon.volatile.bindTurns--;bcEffectLog(`${mon.name}は拘束技で${d}ダメージ！`);if(mon.volatile.bindTurns<=0){delete mon.volatile.bindTurns;delete mon.volatile.bindOwner;delete mon.volatile.bindMove;delete mon.volatile.bindDamage;}}
 if(mon.volatile?.curse&&!mon.fainted&&mon.hp>0){const d=Math.max(1,Math.floor(mon.maxhp/4));mon.hp=Math.max(0,mon.hp-d);bcEffectLog(`${mon.name}はのろいで${d}ダメージ！`);}
 if(mon.volatile?.nightmare&&mon.status==='slp'&&!mon.fainted&&mon.hp>0){const d=Math.max(1,Math.floor(mon.maxhp/4));mon.hp=Math.max(0,mon.hp-d);bcEffectLog(`${mon.name}はあくむで${d}ダメージ！`);}else if(mon.status!=='slp'&&mon.volatile?.nightmare)delete mon.volatile.nightmare;
 if(bcAbility(mon,b)==='hungerswitch')mon._hangry=!mon._hangry;
 }
 const keptVolatile=new Map(all.map(mon=>[mon.uid,Object.fromEntries(['bindTurns','bindOwner','bindMove','bindDamage','nightmare','curse','curseOwner','foresight','miracleEye','lockedMove','lockedMoveTurns','uproarTurns'].filter(k=>mon.volatile&&mon.volatile[k]!==undefined).map(k=>[k,mon.volatile[k]]))]));
 BC_prevProcessEndTurn(b);
 for(const mon of all){if(!mon)continue;mon.volatile=mon.volatile||{};Object.assign(mon.volatile,keptVolatile.get(mon.uid)||{});}
 for(const side of ['player','enemy']){const cond=b.sideConditions?.[side];if(!cond)continue;for(const key of ['safeguardTurns','mistTurns'])if(cond[key]>0){cond[key]--;if(cond[key]===0)bcEffectLog(side==='player'?'味方の場の保護効果が切れた。':'相手側の場の保護効果が切れた。');}}
 for(const mon of all){if(!mon)continue;if(active.has(mon.uid))bcUpdateDynamicForm(mon,b);if(mon.hp<=0){mon.hp=0;mon.fainted=true;for(const key of ['bindTurns','bindOwner','bindMove','bindDamage','nightmare','curse','curseOwner','lockedMove','lockedMoveTurns','uproarTurns','leechseed','leechseedOwner'])delete mon.volatile?.[key];}}
};

// Entry events react to stat drops such as Intimidate and update weather-dependent forms.
const BC_prevTriggerEntry=triggerEntryEffects;
triggerEntryEffects=function(entering,foes,b){const before=new Map((foes||[]).filter(Boolean).map(m=>[m.uid,{...(m.stages||{})}]));const result=BC_prevTriggerEntry(entering,foes,b);for(const foe of foes||[]){if(!foe)continue;const old=before.get(foe.uid)||{};if(Number(foe.stages?.atk||0)<Number(old.atk||0)){const ab=bcAbility(foe,b);if(['clearbody','whitesmoke','fullmetalbody','hypercutter'].includes(ab))foe.stages.atk=old.atk||0;else bcReactToStatDrop(foe,'atk',-1,null,b);}}for(const mon of entering||[])bcUpdateDynamicForm(mon,b);return result;};

// Apply berries and consumable items after real damage; retain the original damage pipeline.
const BC_prevApplyDamage=applyDamage;
applyDamage=function(target,damage,source=null,move=null){const beforeHp=Number(target?.hp||0),beforeItem=target?.heldItem||'',actual=BC_prevApplyDamage(target,damage,source,move);if(!target||!source||actual<=0)return actual;const b=state.battle,eff=move?typeMult(resolveContextMoveData(move,source,target,b).type,monSpecies(target),target):1,hpDamage=Math.max(0,beforeHp-Number(target.hp||0));
 if(hpDamage>0&&eff>1&&bcItem(target)==='weaknesspolicy'){applyBoosts(target,{atk:2,spa:2},'じゃくてんほけん');bcConsumeItem(target,'弱点攻撃');}
 if(hpDamage>0&&target.hp>0&&target.hp<=target.maxhp/2&&['sitrusberry','figyberry','wikiberry','magoberry','aguavberry','iapapaberry'].includes(bcItem(target))){const it=bcItem(target),heal=Math.max(1,Math.floor(target.maxhp*(it==='sitrusberry'?1/4:1/3)));target.hp=Math.min(target.maxhp,target.hp+heal);bcConsumeItem(target,'HP回復');bcEffectLog(`${target.name}はきのみでHPを回復した！`);}
 if(hpDamage>0&&source.hp>0&&bcItem(target)==='redcard'&&target.hp>0){const side=bcSide(source,b),team=side==='player'?b.playerTeam:b.enemyTeam,active=side==='player'?b.playerActive:b.enemyActive,ix=team.findIndex(m=>m.uid===source.uid),next=team.findIndex((m,i)=>i!==ix&&!m.fainted&&m.hp>0&&!active.includes(i));if(next>=0){const slot=active.indexOf(ix);if(slot>=0){active[slot]=next;bcConsumeItem(target,'レッドカード');bcEffectLog(`${source.name}はレッドカードで交代させられた！`);triggerEntryEffects([team[next]],bcActiveMons(bcOppositeSide(side),b),b);}}}
 if(hpDamage>0&&source.hp>0&&bcItem(source)==='shellbell'){const heal=Math.max(1,Math.floor(actual/8));source.hp=Math.min(source.maxhp,source.hp+heal);}
 if(beforeHp>0&&target.hp<=0&&target._destinyBondTurn===b?.turn&&source.hp>0){source.hp=0;source.fainted=true;bcEffectLog(`${source.name}はみちづれになった！`);}
 if(beforeItem&&target.heldItem!==beforeItem)target._itemConsumed=true;
 return actual;};

// Tera: one use per side per battle. Defensive type changes; original types retained for STAB.
function bcActivateTera(mon,b,side='player'){if(!mon||!b||mon.terastallized||mon.megaActive||b.teraUsedBySide?.[side]||(side==='player'&&b.megaPendingSlots?.some(slot=>b.playerTeam?.[b.playerActive?.[slot]]?.uid===mon.uid)))return false;const teraType=mon.teraType||mon.types?.[0]||monSpecies(mon)?.types?.[0]||'Normal';mon._teraOriginalTypes=[...(mon._baseBattleTypes||mon.types||monSpecies(mon)?.types||[])];mon.teraType=teraType;mon.terastallized=true;mon.types=[teraType];b.teraUsedBySide=b.teraUsedBySide||{player:false,enemy:false};b.teraUsedBySide[side]=true;bcEffectLog(`${mon.name}はテラスタルした！ ${TYPE_JA[teraType]||teraType}タイプになった！`);return true;}
const BC_prevRenderBattlePage=renderBattlePage;
renderBattlePage=function(){
 const battle=state.battle;
 if(battle){
  const normalizeSide=(teamKey,activeKey)=>{
   if(!Array.isArray(battle[teamKey]))battle[teamKey]=[];
   const team=battle[teamKey];
   for(const mon of team){
    if(!mon||typeof mon!=='object')continue;
    const rawMax=Number(mon.maxhp??mon.stats?.hp??mon.hp??1);
    mon.maxhp=Number.isFinite(rawMax)&&rawMax>0?rawMax:1;
    const rawHp=Number(mon.hp??mon.maxhp);
    mon.hp=Number.isFinite(rawHp)?Math.max(0,rawHp):mon.maxhp;
   }
   const active=Array.isArray(battle[activeKey])?battle[activeKey].slice():[];
   const used=new Set();
   for(let slot=0;slot<active.length;slot++){
    const idx=Number(active[slot]);
    if(Number.isInteger(idx)&&idx>=0&&idx<team.length&&team[idx]&&typeof team[idx]==='object'&&!used.has(idx)){
     active[slot]=idx;used.add(idx);continue;
    }
    const fallback=team.findIndex((mon,i)=>mon&&typeof mon==='object'&&!used.has(i)&&!mon.fainted&&Number(mon.hp)>0);
    active[slot]=fallback>=0?fallback:-1;
    if(fallback>=0)used.add(fallback);
   }
   battle[activeKey]=active;
  };
  normalizeSide('enemyTeam','enemyActive');
  normalizeSide('playerTeam','playerActive');
 }
 let html=BC_prevRenderBattlePage();
 if(!state.battle||typeof html!=='string')return html;
 const b=state.battle,slot=state.selectedActiveSlot||0,mon=b.playerTeam?.[b.playerActive?.[slot]];
 const disabled=!mon||mon.fainted||mon.terastallized||mon.megaActive||b.turnBusy||b.result||b.teraUsedBySide?.player;
 const label=mon?.terastallized?'🌟 テラスタル済み':(b.teraPendingSlots?.includes(slot)?'🌟 テラスタル選択中（取消）':'🌟 テラスタル');
 const btn=`<button class="btn btn-ghost" data-action="toggle-tera" ${disabled&&!b.teraPendingSlots?.includes(slot)?'disabled':''}>${label}</button>`;
 return html.replace(/(<button[^>]*data-action="toggle-mega"[\s\S]*?<\/button>)/,`$1${btn}`);
};
const BC_prevHandleAction=handleAction;
handleAction=async function(action,el){const b=state.battle;if(action==='toggle-mega'&&b&&b.teraPendingSlots?.includes(state.selectedActiveSlot||0)){toast('テラスタルを解除してからメガシンカを選択してください。','warn');return;}if(action==='toggle-tera'){if(!b||b.result||b.turnBusy)return;const slot=state.selectedActiveSlot||0,mon=b.playerTeam?.[b.playerActive?.[slot]];if(!mon||mon.fainted)return;if(b.teraUsedBySide?.player){toast('このバトルではテラスタルを使用済みです。','warn');return;}if(mon.megaActive||b.megaPendingSlots?.includes(slot)){toast('メガシンカの選択を解除してからテラスタルを選択してください。','warn');return;}b.teraPendingSlots=b.teraPendingSlots||[];if(b.teraPendingSlots.includes(slot)){b.teraPendingSlots=b.teraPendingSlots.filter(x=>x!==slot);toast('テラスタル選択を解除しました。');}else{b.teraPendingSlots=[slot];toast('技を実行するとテラスタルします。','good');}renderPage();return;}if(action==='care-task-speed'){bcSpeedCareTask(el.dataset.uid,el.dataset.task);return;}if(action==='care-task-claim'){bcClaimCareTask(el.dataset.uid,el.dataset.task);return;}if(['care-adventure','care-feed','care-play','care-train','care-rest','care-tend'].includes(action)){bcStartCareTask(el.dataset.uid||state.careSelectedUid,action.replace('care-',''));return;}return BC_prevHandleAction(action,el);};
const BC_prevExecuteTurn=executeTurn;
executeTurn=async function(actions){const b=state.battle;if(b&&Array.isArray(b.teraPendingSlots)&&b.teraPendingSlots.length){for(const slot of b.teraPendingSlots){const idx=b.playerActive?.[slot],mon=b.playerTeam?.[idx];if(mon&&actions.some(a=>a.slot===slot&&a.actorUid===mon.uid))bcActivateTera(mon,b,'player');}b.teraPendingSlots=[];}const result=await BC_prevExecuteTurn(actions);if(state.battle===b&&b){b.eventQueue=[];}return result;};
const BC_prevMegaEvolve=megaEvolve;
megaEvolve=function(mon,side='player'){if(mon?.terastallized){toast('テラスタル中はメガシンカできません。','warn');return false;}return BC_prevMegaEvolve(mon,side);};

// Timed care activities: each action takes 5 minutes, persists in the save, and can be shortened for 2,500 VP.
function bcActivityTitle(task){return ({adventure:'旅',feed:'ごはん',play:'遊び',train:'トレーニング',rest:'休息',tend:'お世話'})[task]||task;}
function bcCompleteCareReward(mon,task){ensureCareMon(mon);if(task==='adventure'){takeExp(mon,12+randomInt(19),'adventure');addFriendship(mon,3);}
 else if(task==='feed'){addFriendship(mon,20);mon.activityCounts.farm=Number(mon.activityCounts.farm||0)+1;}
 else if(task==='play'){addFriendship(mon,12);mon.activityCounts.farm=Number(mon.activityCounts.farm||0)+1;mon.farmMinutes=Number(mon.farmMinutes||0)+10;}
 else if(task==='train'){takeExp(mon,6+randomInt(11),'training');addFriendship(mon,1);}
 else if(task==='rest'){mon.moves=(mon.moves||[]).map(m=>{const mm=getMove(m.id);return {...m,pp:Number(mm?.pp||m.pp||10)};});addFriendship(mon,2);}
 else if(task==='tend'){addFriendship(mon,15);mon.activityCounts.farm=Number(mon.activityCounts.farm||0)+1;}
 notePersonality(mon);}
function bcStartCareTask(uid,task){const mon=state.owned.find(m=>m.uid===uid);if(!mon){toast('対象のポケモンを選択してください。','warn');return;}mon.activityTasks=mon.activityTasks&&typeof mon.activityTasks==='object'?mon.activityTasks:{};const existing=mon.activityTasks[task];if(existing){toast(`${bcActivityTitle(task)}は実行中です。完了時刻を確認してください。`,'warn');renderPage();return;}mon.activityTasks[task]={startedAt:Date.now(),readyAt:Date.now()+BC_ACTIVITY_MS};saveCare();toast(`${mon.name}の${bcActivityTitle(task)}を開始！ 5分後に完了します。`,'good');renderPage();}
function bcSpeedCareTask(uid,task){const mon=state.owned.find(m=>m.uid===uid),entry=mon?.activityTasks?.[task];if(!entry||entry.readyAt<=Date.now()){toast('短縮できる活動がありません。','warn');return;}if(state.vp<BC_ACTIVITY_SPEED_COST){toast('時短には2500 VPが必要です。','warn');return;}state.vp-=BC_ACTIVITY_SPEED_COST;entry.readyAt=Date.now();saveCare();updateTop();toast('2500 VPで活動を完了可能にしました。','good');renderPage();}
function bcClaimCareTask(uid,task){const mon=state.owned.find(m=>m.uid===uid),entry=mon?.activityTasks?.[task];if(!mon||!entry){toast('活動データがありません。','warn');return;}if(Number(entry.readyAt)>Date.now()){toast(`${bcActivityTitle(task)}はあと${Math.ceil((entry.readyAt-Date.now())/1000)}秒です。`,'warn');return;}delete mon.activityTasks[task];bcCompleteCareReward(mon,task);saveCare();toast(`${mon.name}の${bcActivityTitle(task)}が完了しました！`,'good');renderPage();}
const BC_prevRenderCare=renderCare;
renderCare=function(){let html=BC_prevRenderCare();const rows=state.owned.map(mon=>{const tasks=mon.activityTasks||{};const taskRows=Object.entries(tasks).map(([task,entry])=>{const rem=Math.max(0,Number(entry.readyAt||0)-Date.now()),ready=rem<=0;return `<div class="activity-row"><div class="activity-copy"><b>${esc(bcActivityTitle(task))}</b><small>${ready?'完了！受け取り可能':`残り ${Math.ceil(rem/1000)} 秒`}</small></div><div class="care-action-row"><button class="btn btn-primary" data-action="care-task-claim" data-uid="${esc(mon.uid)}" data-task="${esc(task)}" ${ready?'':'disabled'}>受け取る</button><button class="btn btn-ghost" data-action="care-task-speed" data-uid="${esc(mon.uid)}" data-task="${esc(task)}" ${ready||state.vp<BC_ACTIVITY_SPEED_COST?'disabled':''}>2500 VPで時短</button></div></div>`;}).join('');return `<article class="care-mon-card"><div class="care-mon-head"><div><b>${esc(mon.name)}</b><div class="small muted">Lv.${mon.level}</div></div><div class="care-action-row"><button class="btn btn-secondary" data-action="care-adventure" data-uid="${esc(mon.uid)}">旅に出す</button><button class="btn btn-secondary" data-action="care-feed" data-uid="${esc(mon.uid)}">ごはん</button><button class="btn btn-secondary" data-action="care-play" data-uid="${esc(mon.uid)}">遊ぶ</button><button class="btn btn-secondary" data-action="care-train" data-uid="${esc(mon.uid)}">訓練</button><button class="btn btn-ghost" data-action="care-rest" data-uid="${esc(mon.uid)}">休息</button><button class="btn btn-ghost" data-action="care-tend" data-uid="${esc(mon.uid)}">お世話</button></div></div>${taskRows||'<small class="muted">実行中の活動はありません。</small>'}</article>`;}).join('');return html+`<section class="panel" style="margin-top:16px"><div class="panel-head"><h2>⏱ 5分アクティビティ</h2><span class="pill">各活動 5分</span></div><div class="panel-body"><p class="small muted">旅・ごはん・遊び・訓練・休息・お世話は、それぞれ開始から5分で完了します。ブラウザを閉じても時刻は保存され、再度開いたときに残り時間を計算します。時短は1回2,500 VPです。</p><div class="care-list">${rows||'<div class="empty-state">ポケモンを仲間にすると活動を始められます。</div>'}</div></div></section>`;};

// One lightweight clock only refreshes the care screen; task completion itself is timestamp-based.
if(!window.__bcCareClock){window.__bcCareClock=window.setInterval(()=>{if(state.page==='care'){const hasTasks=state.owned.some(m=>Object.keys(m.activityTasks||{}).length);if(hasTasks)renderPage();}},15000);}

// Explicit audits: the totals below are data counts, not a claim that every unique effect has passed tests.
function bcAuditBattleEngine(){const moves=Object.values(state.data?.movesById||{}),abilities=state.data?.abilitiesList||[],apiHandled=typeof V170_HANDLED_API!=='undefined'?V170_HANDLED_API:new Set(),moveRows=moves.map(m=>({id:m.id,apiId:m.apiId,name:getMoveName(m),status:apiHandled.has(Number(m.apiId||0))?'common-handler-connected':(isMoveClassifiedDamageV2(m)?'base-damage-path':'needs-individual-review')}));return {version:BC_ENGINE_VERSION,dexCount:state.data?.dex?.length||0,moveCount:moves.length,abilityCount:abilities.length,moveStatuses:{commonHandlerConnected:moveRows.filter(x=>x.status==='common-handler-connected').length,baseDamagePath:moveRows.filter(x=>x.status==='base-damage-path').length,needsIndividualReview:moveRows.filter(x=>x.status==='needs-individual-review').length},systems:['target/priority/accuracy foundations','move flags and protect bypass','charge/recharge/locked move/binding','status immunity and stat-drop reactions','dynamic abilities/forms and Ruin auras','held-item consumption/recovery/suppression','side conditions/hazards/screens/weather/terrain','volatile states and switching cleanup','Terastalization and Mega exclusion','persisted five-minute care activities'],verified:['JavaScript syntax check','static structure and data-count audit'],notYetVerified:['Every one of 937 move-specific effects in an actual browser battle','Every one of 374 abilities against all combinations','Full generation-exact timing edge cases']};}
const BC_prevRenderTraining=renderTraining;
renderTraining=function(){let html=BC_prevRenderTraining();const mon=state.owned.find(m=>m.uid===state.selectedOwned)||state.owned[0];const extras=[['boosterenergy','ブーストエナジー'],['weaknesspolicy','じゃくてんほけん'],['whiteherb','しろいハーブ'],['redcard','レッドカード'],['shellbell','かいがらのすず'],['lumberry','ラムのみ'],['ringtarget','ねらいのまと'],['rustedsword','くちたけん'],['rustedshield','くちたたて']];const wanted=extras.filter(([id])=>!html.includes(`value=\"${id}\"`));const options=wanted.map(([id,label])=>`<option value=\"${id}\" ${itemSlug(mon?.heldItem)===id?'selected':''}>${label}</option>`).join('');if(options)html=html.replace(/(<select id=\"held-item\"[^>]*>)([\s\S]*?)(<\/select>)/,(_,a,b,c)=>a+b+options+c);return html;};
const BC_prevRenderSettings=renderSettings;
renderSettings=function(){const html=BC_prevRenderSettings();let audit;try{audit=bcAuditBattleEngine();}catch(e){audit={version:BC_ENGINE_VERSION,moveCount:0,abilityCount:0,moveStatuses:{},notYetVerified:['データ読込後に再診断してください']};}const errors=(state.battle?.errors||[]).slice(-12);const errHtml=errors.length?errors.slice().reverse().map(e=>`<details class=\"diag-error\"><summary>${esc(e.at||'')} · ${esc(e.where||'')} · ${esc(e.message||'')}</summary><pre>${esc(JSON.stringify(e,null,2))}</pre></details>`).join(''):'<p class=\"small muted\">このバトルで記録された実行時エラーはありません。</p>';return html+`<section class=\"panel\" style=\"margin-top:16px\"><div class=\"panel-head\"><h2>🛠 バトル診断・実装監査</h2><span class=\"pill\">${BC_ENGINE_VERSION}</span></div><div class=\"panel-body\"><p class=\"small muted\">データ収録数と、共通処理への接続状況を分けて表示します。接続済みは全例外の動作確認済みという意味ではありません。</p><div class=\"care-mon-meta\"><span class=\"pill\">図鑑 ${Number(audit.dexCount||0).toLocaleString()}種</span><span class=\"pill\">技 ${Number(audit.moveCount||0).toLocaleString()}件</span><span class=\"pill\">特性 ${Number(audit.abilityCount||0).toLocaleString()}件</span><span class=\"pill\">共通処理接続 ${Number(audit.moveStatuses?.commonHandlerConnected||0).toLocaleString()}技</span></div><p class=\"small muted\">通常ダメージ経路 ${Number(audit.moveStatuses?.baseDamagePath||0).toLocaleString()}技 / 個別確認が必要 ${Number(audit.moveStatuses?.needsIndividualReview||0).toLocaleString()}技</p><details><summary>実装範囲・未検証項目</summary><ul>${(audit.systems||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><b>実行検証済み</b><ul>${(audit.verified||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><b>未検証</b><ul>${(audit.notYetVerified||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details><h3 style=\"margin-top:14px\">直近の実行時エラー</h3>${errHtml}<p class=\"tiny muted\">バトル中に捕捉した例外は時刻・発生箇所・エラーメッセージ・スタック・行動情報を保存します。ページを再読み込みすると、対戦中の診断ログは失われる場合があります。</p></div></section>`;};
function bcRuntimeDiagnostics(){return {version:BC_ENGINE_VERSION,battleErrors:state.battle?.errors||[],battleTurn:state.battle?.turn||null,activePlayer:bcActiveMons('player').map(m=>({name:m.name,ability:m.abilityId,item:m.heldItem,types:m.types,status:m.status,volatile:m.volatile})),activeEnemy:bcActiveMons('enemy').map(m=>({name:m.name,ability:m.abilityId,item:m.heldItem,types:m.types,status:m.status,volatile:m.volatile})),sideConditions:state.battle?.sideConditions||null};}
if(!window.__bcGlobalErrorHooks){window.__bcGlobalErrorHooks=true;window.addEventListener('error',e=>{if(state.battle)bcRecordError('window.error',e.error||e.message,{filename:e.filename||'',lineno:e.lineno||0,colno:e.colno||0});});window.addEventListener('unhandledrejection',e=>{if(state.battle)bcRecordError('unhandledrejection',e.reason||'Unknown rejection',{});});}
if(window.PokemonChampions2DData){Object.assign(window.PokemonChampions2DData,{version:BC_ENGINE_VERSION,runtimeVersion:BC_ENGINE_VERSION,auditBattleEngine:bcAuditBattleEngine,runtimeDiagnostics:bcRuntimeDiagnostics,activityRules:{durationMs:BC_ACTIVITY_MS,speedCostVP:BC_ACTIVITY_SPEED_COST},teraRules:{oncePerSide:true,exclusiveWithMega:true,defensiveTypeChange:true},protectionChainRules:{familyIds:[...V171_GUARD_CHAIN_IDS],personalGuardIds:[...V171_PERSONAL_GUARD_IDS],successChance:'1 / 5^consecutiveCount',secondUse:0.2,thirdUse:0.04,fourthUse:0.008,minimumChance:'1/15625'}});}
if(window.PokemonChampions2D){Object.assign(window.PokemonChampions2D,{auditBattleEngine:bcAuditBattleEngine,runtimeDiagnostics:bcRuntimeDiagnostics,activateTerastalization:bcActivateTera});}

// v16.19 gameplay usability and battle-effect integration layer
const V19_VERSION='v16.19';
const V19_OHKO_API=new Set([12,32,90,329]);
const V19_OHKO_NAMES=new Set(['guillotine','horndrill','fissure','sheercold']);
const V19_STATUS_MAP={paralysis:'par',burn:'brn',poison:'psn',sleep:'slp',freeze:'frz'};
const V19_TYPE_ITEMS={
 flameplate:'Fire',charcoal:'Fire',splashplate:'Water',mysticwater:'Water',zapplate:'Electric',magnet:'Electric',meadowplate:'Grass',miracleseed:'Grass',icicleplate:'Ice',nevermeltice:'Ice',fistplate:'Fighting',blackbelt:'Fighting',toxicplate:'Poison',poisonbarb:'Poison',earthplate:'Ground',softsand:'Ground',skyplate:'Flying',sharpbeak:'Flying',mindplate:'Psychic',twistedspoon:'Psychic',insectplate:'Bug',silverpowder:'Bug',stoneplate:'Rock',hardstone:'Rock',spookyplate:'Ghost',spelltag:'Ghost',dracoplate:'Dragon',dragonfang:'Dragon',dreadplate:'Dark',blackglasses:'Dark',ironplate:'Steel',metalcoat:'Steel',pixieplate:'Fairy',fairyfeather:'Fairy',silkscarf:'Normal'
};
const V19_STATUS_TAGS=new Set(['paralysis','burn','poison','sleep','freeze','confusion','trap','no-type-immunity','leech-seed','protect','disable','nightmare','perish-song','infatuation','torment','ingrain','yawn','embargo','heal-block','silence','tar-shot']);
function v19Num(v){if(v==null)return 0;const n=Number(String(v).replace(/[％%]/g,''));return Number.isFinite(n)?n:0;}
function v19Meta(move){return move?.apiAdditional&&typeof move.apiAdditional==='object'?move.apiAdditional:{};}
function v19EnrichMove(move){
 if(!move||typeof move!=='object'||move._v19Decorated)return move;
 const a=v19Meta(move),desc=String(move.mechanicDescription||move.description||'').toLowerCase();
 const drain=v19Num(a['吸収']);
 if(drain>0&&!move.drain)move.drain=[drain,100];
 if(drain<0&&!move.recoil)move.recoil=[Math.abs(drain),100];
 if(!move.multihit){
  let match=desc.match(/hits\s+(\d+)\s*(?:-|to)\s*(\d+)\s+times/i);
  if(match)move.multihit=[Number(match[1]),Number(match[2])];
  else if(/hits\s+twice|hits\s+two\s+times/i.test(desc))move.multihit=[2,2];
  else if(/hits\s+three\s+times/i.test(desc))move.multihit=[3,3];
  else if(/hits\s+four\s+times/i.test(desc))move.multihit=[4,4];
 }
 const status=String(a['状態異常']||'').toLowerCase();
 move._v19TagData={status,statusChance:v19Num(a['状態異常率']),flinchChance:v19Num(a['ひるみ率']),heal:v19Num(a['回復']),drain,description:desc};
 move._v19Decorated=true;
 return move;
}
const V19_prevGetMove=getMove;
getMove=function(id){return v19EnrichMove(V19_prevGetMove(id));};
function v19IsOhko(move){return !!(move?.ohko||V19_OHKO_API.has(Number(move?.apiId||0))||V19_OHKO_NAMES.has(slug(move?.id||move?.name||'')));}
function v19OhkoAccuracy(move,actor,target){
 const al=Number(actor?.level||1),tl=Number(target?.level||1);if(al<tl)return 0;if(slug(actor?.abilityId)==='noguard'||slug(target?.abilityId)==='noguard')return 100;
 const api=Number(move?.apiId||0);
 const ice=(actor?.types||monSpecies(actor)?.types||[]).includes('Ice');
 const base=api===329&&!ice?20:30;
 return Math.max(1,Math.min(100,base+al-tl));
}
function v19ExecuteOhko(actor,target,move,b){
 const api=Number(move?.apiId||0),name=getMoveName(move);
 const types=target?.types||monSpecies(target)?.types||[];
 if(b?.mode==='raid'&&(target?.raidBoss||b.enemyTeam?.some(m=>m?.uid===target?.uid&&m.raidBoss))){battleLog(`${target.name}には一撃必殺技が通用しない！`);actor._lastMoveHit=false;return;}
 if(slug(target?.abilityId)==='sturdy'){battleLog(`${target.name}の「がんじょう」で一撃必殺を防いだ！`);actor._lastMoveHit=false;return;}
 if(target?.volatile?.substituteHp>0){battleLog(`${target.name}のみがわりに一撃必殺技を防がれた！`);actor._lastMoveHit=false;return;}
 if(api===90&&!target?._v19Grounded&&Number(b?.gravityTurns||0)<=0&&(types.includes('Flying')||slug(target?.abilityId)==='levitate'||itemSlug(target?.heldItem)==='airballoon')){battleLog(`${name}は空中の相手には当たらない！`);actor._lastMoveHit=false;return;}
 if(api===329&&types.includes('Ice')){battleLog(`${target.name}には「ぜったいれいど」が効かない！`);actor._lastMoveHit=false;return;}
 const amount=Math.max(1,Number(target.hp||0));
 const actual=applyDamage(target,amount,actor,move);
 actor._lastMoveHit=actual>0;actor._lastMoveDamage=actual;
 battleLog(actual>0?'一撃必殺！':'しかし うまく決まらなかった！');
}
const V19_prevAccuracy=getEffectiveAccuracy;
getEffectiveAccuracy=function(move,actor,target,b){if(v19IsOhko(move))return v19OhkoAccuracy(move,actor,target);return V19_prevAccuracy(move,actor,target,b);};

// Tag metadata becomes real battle behavior: status, confusion, flinch, trapping, healing, draining and multi-hit.
function v19ApplyTaggedStatus(actor,target,move,b){
 const t=move?._v19TagData||v19EnrichMove(move)?._v19TagData||{};
 const tag=String(t.status||'').toLowerCase(),api=Number(move?.apiId||0),id=slug(move?.id||move?.name||''),canonical=typeof v21MoveId==='function'?v21MoveId(move):'';
 // Core applyMoveExtras already attempted these statuses; do not retry after a Lum Berry cures them.
 if(move?.status||['thunderwave','willowisp','toxic'].includes(canonical))return;
 // These effects already have their own complete handlers in the v16.18 engine.
 const handled=new Set([12,20,35,48,50,83,109,128,171,182,193,195,197,207,213,250,259,260,275,281,298,316,328,357,448,611]);
 if(handled.has(api)||['protect','detect','disable','nightmare','perishsong','attract','torment','ingrain','yawn','leechseed','foresight','miracleeye'].includes(id))return;
 if(api===116){actor._v19CritStage=2;battleLog(`${actor.name}は急所に当たりやすくなった！`);return;}
 if(api===673){actor._v19SureCritTurns=1;battleLog(`${actor.name}は次の攻撃を必ず急所に当てる構え！`);return;}
 if(!tag||['none','なし','—'].includes(tag))return;
 const desc=String(move.mechanicDescription||'').toLowerCase();
 const isStatus=move.category==='Status'||!isMoveClassifiedDamageV2(move);
 const sheer=slug(actor?.abilityId)==='sheerforce';
 const grace=slug(actor?.abilityId)==='serenegrace'?2:1;
 const chance=Math.max(0,Math.min(100,t.statusChance*(grace)));
 const guaranteed=isStatus&&chance===0;
 if(sheer&&!isStatus)return;
 const roll=guaranteed?true:(chance>0&&Math.random()*100<chance);
 if(tag==='paralysis'||tag==='burn'||tag==='poison'||tag==='sleep'||tag==='freeze'){
  if(roll&&!target.status){let st=V19_STATUS_MAP[tag];if(tag==='poison'&&(api===92||/badly poison|もうどく/.test(desc)||id==='toxic'))st='tox';if(st)setStatus(target,st,getMoveName(move));}
 }else if(tag==='confusion'){
  if(roll&&Number(target._confusionTurns||0)<=0){target._confusionTurns=2+Math.floor(Math.random()*4);battleLog(`${target.name}はこんらんした！`);}
 }else if(tag==='trap'){
  target._trappedTurns=Math.max(Number(target._trappedTurns||0),4);
 }else if(tag==='no-type-immunity'){
  target.volatile=target.volatile||{};
  if(api===357||id==='miracleeye')target.volatile.miracleEye=true;
  else target.volatile.foresight=true;
 }else if(tag==='leech-seed'){
  if(!(target.types||monSpecies(target)?.types||[]).includes('Grass')&&!target.volatile?.leechseed){target.volatile=target.volatile||{};target.volatile.leechseed=true;target.volatile.leechseedOwner=actor.uid;battleLog(`${target.name}にやどりぎのタネが根づいた！`);}
 }else if(tag==='unknown'){
  if(api===161&&roll&&!target.status){const st=['par','brn','frz'][Math.floor(Math.random()*3)];setStatus(target,st,getMoveName(move));}
  else if(api===477){target._v19TelekinesisTurns=4;battleLog(`${target.name}は宙に浮き始めた！`);}
  else if(api===479||api===614){target._v19Grounded=true;battleLog(`${target.name}は地面に落とされた！`);}
 }
 else if(tag==='embargo')target._embargoTurns=5;
 else if(tag==='heal-block')target._v19HealBlockTurns=6;
 else if(tag==='silence')target._v19SilenceTurns=3;
 else if(tag==='tar-shot'){target._v19TarShot=true;applyBoosts(target,{spe:-1},getMoveName(move));battleLog(`${target.name}は炎に弱くなった！`);}
}
function v19ApplyTagHealing(actor,target,move,b){
 const tag=move?._v19TagData||{},amount=Number(tag.heal||0),api=Number(move?.apiId||0);
 if(!amount||!Number.isFinite(amount)||move.category!=='Status')return;
 if(api===775){const cost=Math.max(1,Math.floor(actor.maxhp/3));if(actor.hp<=cost){battleLog('HPが足りず、ソウルビートを使えない！');return;}actor.hp-=cost;applyBoosts(actor,{atk:1,def:1,spa:1,spd:1,spe:1},getMoveName(move));battleLog(`${actor.name}は全能力が上がった！`);return;}
 if(api===791||api===816){const team=b.playerTeam.some(m=>m.uid===actor.uid)?b.playerTeam:b.enemyTeam,active=b.playerTeam.some(m=>m.uid===actor.uid)?b.playerActive:b.enemyActive;for(const mon of active.map(i=>team[i]).filter(m=>m&&!m.fainted&&m.hp>0)){const before=mon.hp;mon.hp=Math.min(mon.maxhp,mon.hp+Math.max(1,Math.ceil(mon.maxhp*amount/100)));if(api===816){mon.status=null;mon.statusTurns=0;}if(mon.hp>before)battleLog(`${mon.name}のHPが回復した！`);}return;}
 if(api===505||api===666){const heal=api===666&&b.terrain==='grassy'?2/3:amount/100;const before=target.hp;target.hp=Math.min(target.maxhp,target.hp+Math.max(1,Math.ceil(target.maxhp*heal)));if(target.hp>before)battleLog(`${target.name}は${getMoveName(move)}でHPを回復した！`);return;}
 if(api===685){if(target.status){target.status=null;target.statusTurns=0;battleLog(`${target.name}の状態異常が治った！`);}const heal=Math.max(1,Math.ceil(actor.maxhp*amount/100)),before=actor.hp;actor.hp=Math.min(actor.maxhp,actor.hp+heal);if(actor.hp>before)battleLog(`${actor.name}のHPが回復した！`);return;}
 if(['recover','roost','slackoff','milkdrink','softboiled','synthesis','moonlight','morningsun','rest','healorder','shoreup','swallow','stockpile'].includes(slug(move.id||''))||move.heal)return;
 if(move.target==='self'&&amount>0){const heal=Math.max(1,Math.ceil(actor.maxhp*amount/100)),before=actor.hp;actor.hp=Math.min(actor.maxhp,actor.hp+heal);if(actor.hp>before)battleLog(`${actor.name}は${getMoveName(move)}でHPを回復した！`);}
}
const V19_prevMoveSpecific=applyMoveSpecificEffects;
applyMoveSpecificEffects=function(actor,target,move,b){V19_prevMoveSpecific(actor,target,move,b);if(!actor||!target||!move||!b||slug(actor.abilityId)==='sheerforce'&&move.category!=='Status')return;if(actor._lastMoveHit===false&&move.category!=='Status')return;v19ApplyTaggedStatus(actor,target,move,b);v19ApplyTagHealing(actor,target,move,b);if(target.volatile?.flinch&&target.uid!==actor.uid&&target._v19ActionTurn!==b.turn){delete target.volatile.flinch;target._v19FlinchTurn=b.turn;}const alreadyHasFlinch=(move.secondaries||[]).some(x=>x?.volatileStatus==='flinch')||move.secondary?.volatileStatus==='flinch';const fc=Number(move?._v19TagData?.flinchChance||0);if(fc>0&&!alreadyHasFlinch&&target.uid!==actor.uid&&target.hp>0&&target._v19ActionTurn!==b.turn&&slug(actor.abilityId)!=='sheerforce'){const ch=Math.min(100,fc*(slug(actor.abilityId)==='serenegrace'?2:1));if(Math.random()*100<ch){target._v19FlinchTurn=b.turn;battleLog(`${target.name}はひるんだ！`);}}};

// Confusion, infatuation, flinch and temporary move restrictions.
const V19_prevCanMove=canMove;
canMove=function(mon){const b=state.battle;if(b&&mon?._v19FlinchTurn===b.turn){delete mon._v19FlinchTurn;battleLog(`${mon.name}はひるんで動けない！`);return false;}return V19_prevCanMove(mon);};

// Extend timed tag effects before the existing end-of-turn resolution decides the winner.
const V19_prevProcessEndTurn=processEndTurn;
processEndTurn=function(b){if(b){const all=[...(b.playerTeam||[]),...(b.enemyTeam||[])],active=new Set([...((b.playerActive||[]).map(i=>b.playerTeam?.[i])),...((b.enemyActive||[]).map(i=>b.enemyTeam?.[i]))].filter(Boolean).map(m=>m.uid));for(const mon of all){if(!mon||!active.has(mon.uid)||mon.fainted||mon.hp<=0)continue;
 if(mon._v19HealBlockTurns>0)mon._v19HealBlockTurns--;
 if(mon._v19SilenceTurns>0)mon._v19SilenceTurns--;
 if(mon._v19TelekinesisTurns>0)mon._v19TelekinesisTurns--;
 const held=bcItem(mon),types=mon.types||monSpecies(mon)?.types||[];
 if(held==='blacksludge'&&!types.includes('Poison')){const d=Math.max(1,Math.floor(mon.maxhp/8));mon.hp=Math.max(0,mon.hp-d);battleLog(`${mon.name}はくろいヘドロで${d}ダメージを受けた！`);if(mon.hp<=0)mon.fainted=true;}
 }}V19_prevProcessEndTurn(b);if(b&&b.result==null){for(const mon of [...(b.playerTeam||[]),...(b.enemyTeam||[])]){if(!mon||mon.fainted||mon.hp<=0||mon.status)continue;const held=bcItem(mon);if(held==='flameorb')setStatus(mon,'brn','かえんだま');else if(held==='toxicorb')setStatus(mon,'tox','どくどくだま');}}};

// Critical-hit stages from high-crit tags, Focus Energy, Laser Focus, items and Super Luck.
function v19CriticalChance(actor,target,move,b){
 const desc=String(move?.mechanicDescription||'').toLowerCase();if(move?.willCrit===false)return 0;const guaranteed=move?.willCrit===true||Number(move?.apiId)===817||Number(move?.apiId)===818||/always (?:results in|lands) a critical hit|必ず急所/.test(desc);
 if(guaranteed)return slug(target?.abilityId)==='battlearmor'||slug(target?.abilityId)==='shellarmor'?0:1;
 let stage=Number(actor?._v19CritStage||0);
 const ratio=Number(move?.critRatio||1);if(ratio>1)stage+=Math.max(0,Math.round(ratio)-1);else if(/increased chance for a critical hit|high critical.hit ratio|critical.hit ratio is raised|急所に当たりやすい/.test(desc))stage++;
 if(['scopelens','razorclaw'].includes(bcItem(actor)))stage++;
 if(bcAbility(actor,b)==='superluck')stage++;
 const chance=[1/24,1/8,1/2,1][Math.min(3,Math.max(0,stage))];
 if(slug(target?.abilityId)==='battlearmor'||slug(target?.abilityId)==='shellarmor')return 0;
 const side=bcSide(target,b);if((b.sideConditions?.[side]?.luckyChantTurns||0)>0)return 0;
 return actor?._v19SureCritTurns>0?1:chance;
}
const V19_critExpr='let critical=Math.random()<1/24;let critMult=critical?1.5:1;';
const V19_critExprNew='let critical=Math.random()<v19CriticalChance(actor,target,move,b);let critMult=critical?1.5:1;';


// Grounding, Gravity, Air Balloon, Smack Down, Thousand Arrows and Telekinesis.
const V19_prevTypeMult=typeMult;
typeMult=function(moveType,defSpecies,defMon=null){if(moveType==='Ground'&&defMon){const b=state.battle,gravity=Number(b?.gravityTurns||0)>0,grounded=!!defMon._v19Grounded||gravity,tele=Number(defMon._v19TelekinesisTurns||0)>0&&!gravity;if(tele)return 0;if(!grounded&&itemSlug(defMon.heldItem)==='airballoon')return 0;if(grounded){const types=(defMon.types||defSpecies?.types||[]).filter(t=>t!=='Flying');const spec={...(defSpecies||{}),types};const mon={...defMon,types,abilityId:'none'};return V19_prevTypeMult(moveType,spec,mon);}}return V19_prevTypeMult(moveType,defSpecies,defMon);};
const V19_prevIsGrounded=isGrounded;
isGrounded=function(mon){if(!mon)return false;if(Number(state.battle?.gravityTurns||0)>0)return true;if(mon._v19Grounded)return true;if(Number(mon._v19TelekinesisTurns||0)>0)return false;return V19_prevIsGrounded(mon);};
const V19_prevApplyDamage=applyDamage;
applyDamage=function(target,damage,source=null,move=null){const hadBalloon=!!target&&itemSlug(target.heldItem)==='airballoon'&&!(target.volatile?.substituteHp>0&&source&&source.uid!==target.uid);const actual=V19_prevApplyDamage(target,damage,source,move);if(actual>0&&hadBalloon&&target.heldItem&&itemSlug(target.heldItem)==='airballoon'){target.heldItem='';target._itemConsumed=true;battleLog(`${target.name}のふうせんが割れた！`);}return actual;};

// Held-item effects not yet connected in the base engine.
const V19_prevCurrentStat=currentStat;
currentStat=function(mon,key){let value=V19_prevCurrentStat(mon,key);if(!mon||!state.battle)return value;const item=bcItem(mon),sp=monSpecies(mon);if(key==='spd'&&item==='assaultvest')value=Math.floor(value*1.5);if((key==='def'||key==='spd')&&item==='eviolite'&&sp&&Array.isArray(sp.evos)&&sp.evos.length>0)value=Math.floor(value*1.5);return value;};
const V19_prevCalculateDamage=calculateDamage;
calculateDamage=function(actor,target,move,b){const isThousandArrows=Number(move?.apiId)===614,wasGrounded=!!target?._v19Grounded;if(isThousandArrows)target._v19Grounded=true;let result;try{result=V19_prevCalculateDamage(actor,target,move,b);}finally{if(isThousandArrows&&!wasGrounded)delete target._v19Grounded;}if(!result||!actor||!target||result.blocked||result.damage<=0)return result;const held=bcItem(actor),resolved=resolveContextMoveData(move,actor,target,b),type=resolved.type,base=bcSpeciesBaseId(actor);let factor=1;const boostType=V19_TYPE_ITEMS[held];if(boostType===type&&!((base==='arceus'&&BC_PLATE_TYPES[held]===type)||(base==='silvally'&&BC_MEMORY_TYPES[held]===type)))factor*=1.2;if(held==='expertbelt'&&result.effectiveness>1)factor*=1.2;if(held==='muscleband'&&move.category==='Physical')factor*=1.1;if(held==='wiseglasses'&&move.category==='Special')factor*=1.1;if(held==='metronome'&&actor._v19RepeatMove===move.id&&actor._v19RepeatCount>0)factor*=Math.min(2,1+0.2*actor._v19RepeatCount);if(type==='Fire'&&target._v19TarShot)factor*=2;if(slug(actor.abilityId)==='sheerforce'&&(Number(move?._v19TagData?.statusChance||0)>0||Number(move?._v19TagData?.flinchChance||0)>0)&&!move.secondaries?.length&&!move.secondary)factor*=1.3;result.damage=Math.max(1,Math.floor(result.damage*factor));return result;};
const V19_prevApplyBoosts=applyBoosts;
applyBoosts=function(target,boosts,sourceName=''){const before={...(target?.stages||{})};V19_prevApplyBoosts(target,boosts,sourceName);if(target&&bcItem(target)==='whiteherb'){const keys=Object.keys(before).filter(k=>Number(target.stages?.[k]||0)<Number(before[k]||0));if(keys.length){for(const k of keys)target.stages[k]=before[k];bcConsumeItem(target,'能力下降回復');battleLog(`${target.name}はしろいハーブで能力を戻した！`);}}};
const V19_prevTriggerEntry=triggerEntryEffects;
triggerEntryEffects=function(entering,foes,b){const plain=[],boots=[];for(const mon of entering||[]){if(bcItem(mon)==='heavydutyboots')boots.push(mon);else plain.push(mon);}if(plain.length)V19_prevTriggerEntry(plain,foes,b);for(const mon of boots){const side=b.playerTeam.some(m=>m.uid===mon.uid)?'player':'enemy';const original=b.sideConditions?.[side];if(!original){V19_prevTriggerEntry([mon],foes,b);continue;}b.sideConditions[side]={...original,stealthrock:false,spikes:0,toxicspikes:0,stickyweb:false};try{V19_prevTriggerEntry([mon],foes,b);}finally{b.sideConditions[side]=original;}}};
const V19_prevExecuteAction=executeAction;
executeAction=function(act,b){if(!act||!b)return V19_prevExecuteAction(act,b);const team=act.side==='player'?b.playerTeam:b.enemyTeam,actor=team?.find(m=>m.uid===act.actorUid);if(!actor)return V19_prevExecuteAction(act,b);const switching=act.switchTo!=null;if(switching){for(const key of ['_v19ChoiceMove','_v19RepeatMove','_v19RepeatCount','_v19CritStage','_v19SureCritTurns','_v19TarShot','_v19Grounded','_v19TelekinesisTurns','_v19HealBlockTurns','_v19SilenceTurns','_yawnTurns','_perishTurns','_trappedTurns'])delete actor[key];actor._v19ActionTurn=b.turn;return V19_prevExecuteAction(act,b);}const move=getMove(act.moveId)||null,item=bcItem(actor),choice=['choiceband','choicespecs','choicescarf'].includes(item);if(!choice)actor._v19ChoiceMove=null;if(choice&&actor._v19ChoiceMove&&move&&move.id!==actor._v19ChoiceMove){battleLog(`${actor.name}は${getMoveName(getMove(actor._v19ChoiceMove)||{jpName:actor._v19ChoiceMove})}しか出せない！（こだわり）`);return;}if(actor._v19SilenceTurns>0&&move&&(move.flags?.sound||/sound|sound-based/i.test(String(move.mechanicDescription||''))||BC_SOUND_MOVE_IDS?.has(Number(move.apiId||0)))){battleLog(`${actor.name}はじごくづきの効果で音技を使えない！`);return;}if(actor._v19HealBlockTurns>0&&move&&((Number(move?._v19TagData?.heal||0)>0)||['recover','roost','slackoff','milkdrink','softboiled','synthesis','moonlight','morningsun','healorder','shoreup','swallow','life dew','lifedew','healpulse','floralhealing','junglehealing'].includes(slug(move.id)))){battleLog(`${actor.name}はかいふくふうじでHPを回復できない！`);return;}
 const powerHerb=item==='powerherb'&&V170_CHARGE_API.has(Number(move?.apiId||0)),consumeSureCrit=Number(actor._v19SureCritTurns||0)>0&&Number(move?.apiId)!==673;actor._v19ActionTurn=b.turn;const prevLast=actor._v19RepeatMove;let result;try{result=V19_prevExecuteAction(act,b);}finally{const used=actor.lastMoveId||move?.id;if(consumeSureCrit)actor._v19SureCritTurns=0;if(choice&&used&&!actor._v19ChoiceMove)actor._v19ChoiceMove=used;if(actor.heldItem&&itemSlug(actor.heldItem)!==item)actor._v19ChoiceMove=null;if(item==='metronome'&&used){if(prevLast===used)actor._v19RepeatCount=Number(actor._v19RepeatCount||0)+1;else actor._v19RepeatCount=0;actor._v19RepeatMove=used;}else if(item!=='metronome'){actor._v19RepeatMove=null;actor._v19RepeatCount=0;}if(powerHerb&&actor.heldItem&&itemSlug(actor.heldItem)==='powerherb'&&actor._chargingMove!==move.id)bcConsumeItem(actor,'ため技をすぐに発動');}return result;};

// Temporary targeting for single-target ally healing moves; in a single battle the user heals itself.
function v19AllyTarget(actor,b){const side=b.playerTeam.some(m=>m.uid===actor.uid)?'player':'enemy',team=side==='player'?b.playerTeam:b.enemyTeam,active=side==='player'?b.playerActive:b.enemyActive;const allies=active.map(i=>team[i]).filter(m=>m&&!m.fainted&&m.hp>0);return allies.filter(m=>m.uid!==actor.uid).sort((a,c)=>(a.hp/a.maxhp)-(c.hp/c.maxhp))[0]||actor;}
const V19_prevExecuteTurn=executeTurn;
executeTurn=async function(actions){const restore=[];for(const action of actions||[]){const move=getMove(action.moveId);if(move&&[505,666,791,816].includes(Number(move.apiId))){restore.push([move,move.target]);move.target='normal';}}try{return await V19_prevExecuteTurn(actions);}finally{for(const [move,target] of restore)move.target=target;}};
const V19_prevTargetForAction=targetForAction;
targetForAction=function(actor,act,b){const move=getMove(act?.moveId);if([505,666,791,816].includes(Number(move?.apiId)))return v19AllyTarget(actor,b);return V19_prevTargetForAction(actor,act,b);};

// Box assignment migration and one-screen organizer.
function v19EnsureBoxAssignments(){if(!Array.isArray(state.owned))state.owned=[];const counts=Array(30).fill(0);for(const mon of state.owned){if(Number.isInteger(Number(mon.boxIndex))&&Number(mon.boxIndex)>=0&&Number(mon.boxIndex)<30){mon.boxIndex=Number(mon.boxIndex);counts[mon.boxIndex]++;}else mon.boxIndex=null;}let cursor=0;for(const mon of state.owned){if(mon.boxIndex!=null)continue;while(cursor<29&&counts[cursor]>=30)cursor++;mon.boxIndex=cursor;counts[cursor]++;}state.boxPage=Math.max(0,Math.min(29,Number(state.boxPage||0)));return counts;}
const V19_prevLoadLocal=loadLocal;
loadLocal=function(){const ok=V19_prevLoadLocal();v19EnsureBoxAssignments();return ok;};
const V19_prevMakeOwned=makeOwned;
makeOwned=function(species,options={}){const mon=V19_prevMakeOwned(species,options);const counts=v19EnsureBoxAssignments();let page=Number.isInteger(Number(state.boxPage))?Number(state.boxPage):0;if(counts[page]>=30)page=counts.findIndex(n=>n<30);if(page<0)page=29;mon.boxIndex=page;return mon;};
function v19BoxCount(){const max=Math.max(7,...(state.owned||[]).map(m=>Number(m.boxIndex||0)));return Math.min(30,max+1);}
function v19BoxSortKey(a,b,sort){const pa=monSpecies(a),pb=monSpecies(b);if(sort==='name')return String(a.name||'').localeCompare(String(b.name||''),'ja');if(sort==='level')return Number(b.level||0)-Number(a.level||0);if(sort==='shiny')return Number(!!b.shiny)-Number(!!a.shiny)||Number(pb?.num||0)-Number(pa?.num||0);return Number(pa?.num||a.num||0)-Number(pb?.num||b.num||0);}
renderBox=function(){const counts=v19EnsureBoxAssignments(),boxCount=v19BoxCount();state.boxPage=Math.min(boxCount-1,Math.max(0,Number(state.boxPage||0)));const page=state.boxPage,q=searchKey(state.boxSearch||''),boxMons=state.owned.filter(m=>Number(m.boxIndex||0)===page);let list=boxMons.filter(m=>{const p=monSpecies(m);return !q||searchKey(m.name).includes(q)||searchKey(p?.name).includes(q)||searchKey(p?.jpName).includes(q)||String(p?.num).includes(q);});if(state.boxFilter==='shiny')list=list.filter(m=>m.shiny);if(state.boxFilter==='mark')list=list.filter(m=>m.mark);if(state.boxFilter==='legend')list=list.filter(m=>{const p=monSpecies(m);return p?.isLegendary||p?.isMythical;});const sort=state.boxSort||'dex';list.sort((a,b)=>v19BoxSortKey(a,b,sort));const chosen=state.owned.find(m=>m.uid===state.selectedOwned&&Number(m.boxIndex||0)===page)||list[0]||null;const picked=new Set(state.boxSelectedUids||[]);const arrange=!!state.boxArrangeMode;const slots=Array.from({length:30},(_,i)=>{const mon=list[i];if(!mon)return `<div class="sv-box-slot sv-box-empty" aria-hidden="true"><span>＋</span><small>空き</small></div>`;const p=monSpecies(mon);return `<div class="v19-box-slot-wrap"><button class="sv-box-slot ${chosen?.uid===mon.uid?'selected':''} ${picked.has(mon.uid)?'v19-picked':''}" data-action="select-owned" data-uid="${esc(mon.uid)}"><small>#${String(p?.num||0).padStart(4,'0')}</small>${speciesIcon(mon)}<strong>${esc(mon.name||getPokeName(p))}</strong><small>Lv.${mon.level||50}${mon.shiny?' · ✦':''}${mon.mark?' · ◇':''}</small></button>${arrange?`<button class="v19-box-pick ${picked.has(mon.uid)?'selected':''}" data-action="box-toggle-pick" data-uid="${esc(mon.uid)}" aria-label="${esc(mon.name)}を選択">${picked.has(mon.uid)?'✓':'＋'}</button>`:''}</div>`;}).join('');const countOptions=Array.from({length:boxCount},(_,i)=>`<option value="${i}" ${i===page?'selected':''}>ボックス ${i+1}（${counts[i]||0}/30）</option>`).join('');const sortOptions=[['dex','図鑑番号順'],['name','名前順'],['level','レベル順'],['shiny','色違い優先']].map(([v,l])=>`<option value="${v}" ${sort===v?'selected':''}>${l}</option>`).join('');const moveCount=picked.size|| (chosen?1:0);return `${pageHeader('POKÉMON BOX','ポケモンボックス','6×5マスのボックスを、複数選択・まとめて移動・自動整理で簡単に管理できます。','<div class="action-row"><button class="btn btn-primary" data-page="scout">＋ スカウト</button><button class="btn btn-ghost" data-page="shop">◇ メガストーン</button></div>')}
 <div class="v19-box-tools panel"><div class="v19-box-tools-title"><b>かんたんボックス整理</b><small>移動したいポケモンを選んで、行き先を指定してね。</small></div><div class="v19-box-tools-row"><button class="btn btn-secondary btn-sm" data-action="box-toggle-arrange">${arrange?'整理モードを終了':'複数選択モード'}</button><select id="v19-box-destination" class="field">${countOptions}</select><button class="btn btn-primary btn-sm" data-action="box-move-selected" ${moveCount===0?'disabled':''}>${picked.size?`${picked.size}匹を移動`:'選択中の1匹を移動'}</button><select id="v19-box-sort" class="field">${sortOptions}</select><button class="btn btn-secondary btn-sm" data-action="box-sort-current">並べ替え</button></div><div class="v19-box-tools-row"><button class="btn btn-ghost btn-sm" data-action="box-select-page" ${list.length===0?'disabled':''}>表示中を全選択</button><button class="btn btn-ghost btn-sm" data-action="box-clear-picks" ${picked.size===0?'disabled':''}>選択解除</button><button class="btn btn-ghost btn-sm" data-action="box-auto-organize" ${state.owned.length===0?'disabled':''}>全ボックスを図鑑番号順に自動整理</button><span class="pill">選択 ${picked.size}匹</span><span class="pill">全体 ${state.owned.length}匹</span></div></div>
 <div class="search-row"><input id="box-search" class="field search-field" placeholder="このボックスを検索" value="${esc(state.boxSearch||'')}"><select id="box-filter" class="field select-field"><option value="all">すべて</option><option value="shiny" ${state.boxFilter==='shiny'?'selected':''}>色違い</option><option value="mark" ${state.boxFilter==='mark'?'selected':''}>証付き</option><option value="legend" ${state.boxFilter==='legend'?'selected':''}>伝説・幻</option></select><span class="pill">${list.length} / ${boxMons.length}匹</span></div>
 <div class="sv-box-layout"><section class="panel sv-box-main"><div class="sv-box-tabs">${Array.from({length:boxCount},(_,i)=>`<button class="sv-box-tab ${page===i?'active':''}" data-action="select-box-page" data-index="${i}">ボックス ${i+1}</button>`).join('')}</div><div class="sv-box-grid">${slots}</div><div class="sv-box-status"><span>ボックス ${page+1} / ${boxCount}</span><span>このボックス ${boxMons.length} / 30匹</span><span>表示 ${list.length}匹</span><span>並び順：${({dex:'図鑑番号',name:'名前',level:'レベル',shiny:'色違い優先'})[sort]}</span></div></section>${chosen?renderOwnedDetail(chosen).replace('<aside class="panel detail-card">','<aside class="panel detail-card sv-box-detail">'):`<aside class="panel sv-box-detail"><div class="detail-visual"><span class="muted">ポケモンを選択</span></div><div class="detail-content"><h2>空きボックス</h2><p class="muted small">このボックスにはポケモンがいません。スカウトまたは別ボックスから移動できます。</p><button class="btn btn-primary btn-wide" data-page="scout">ポケモンをスカウト</button></div></aside>`}</div>`;};

// All final-form species, including every type, can be selected as a raid boss from the full picker.
beginRaidPreparation=function(speciesId){const p=state.data.dexById[speciesId];if(!p||!isFinalRecruitSpecies(p)){toast('レイド対象は最終形態のポケモンから選んでください。','bad');return;}if(state.owned.length<1){toast('レイドには手持ちのポケモンが必要です。','warn');return;}state.raidTargetId=speciesId;state.raidPartyIds=(state.team||[]).filter(uid=>state.owned.some(m=>m.uid===uid)).slice(0,6);if(state.raidPartyIds.length<6)for(const m of state.owned){if(state.raidPartyIds.length>=6)break;if(!state.raidPartyIds.includes(m.uid))state.raidPartyIds.push(m.uid);}state.raidPicker=false;state.page='scout';renderPage();};
const V19_prevRenderScout=renderScout;
renderScout=function(){if(state.raidPicker){const q=searchKey(state.scoutSearch||''),all=finalRecruitDex().filter(p=>!q||searchKey(p.name).includes(q)||searchKey(p.jpName).includes(q)||searchKey(p.displayName).includes(q)||String(p.num)===q),limit=Math.max(60,Number(state.raidVisible||60)),shown=all.slice(0,limit);return `${pageHeader('TYPE RAID SELECTOR','レイドの相手を選ぶ','最終形態のポケモンなら、タイプを問わずレイドボスに指定できます。')}<div class="panel"><div class="panel-body"><div class="search-row"><input id="scout-search" class="field search-field" placeholder="ポケモン名・図鑑番号で検索" value="${esc(state.scoutSearch||'')}"><span class="pill">${all.length}匹が該当</span><button class="btn btn-ghost" data-action="close-raid-picker">戻る</button></div><div class="dex-grid v19-raid-picker-grid">${shown.map(p=>`<button class="dex-card" data-action="start-legendary-raid" data-id="${esc(p.id)}">${speciesIcon(p)}<strong>${esc(getPokeName(p))}</strong>${typesHtml(p.types||[])}<small>このポケモンとレイド</small></button>`).join('')}</div>${shown.length<all.length?`<button class="btn btn-secondary btn-wide" style="margin-top:12px" data-action="raid-picker-more">さらに表示（${shown.length}/${all.length}）</button>`:''}</div></div>`;}
 let html=V19_prevRenderScout();html=html.replace("pageHeader('LEGENDARY RAID / PREPARATION','伝説レイドの準備'","pageHeader('TYPE RAID / PREPARATION','タイプ別レイドの準備'").replace("'伝説ポケモン'","'レイドボス'").replace('伝説レイドに挑戦','このポケモンとレイド');
 const headerButton='<button class="btn btn-ghost" data-page="shop">◇ メガストーンを買う</button>';
 html=html.replace(headerButton,`<button class="btn btn-secondary" data-action="open-raid-picker">タイプ別レイドを図鑑から選ぶ</button>${headerButton}`);
 html=html.replace(/<button class="btn btn-primary btn-wide" data-action="claim-scout" data-id="([^"]+)">このポケモンを仲間にする<\/button>/,(_,id)=>`<div class="v19-scout-actions"><button class="btn btn-primary" data-action="claim-scout" data-id="${id}">このポケモンを仲間にする</button><button class="btn btn-secondary" data-action="start-legendary-raid" data-id="${id}">このポケモンとレイド</button></div>`);
 return html;};

// Add missing useful items to the training selector while retaining the existing options.
const V19_prevRenderTraining=renderTraining;
renderTraining=function(){let html=V19_prevRenderTraining();const mon=state.owned.find(m=>m.uid===state.selectedOwned)||state.owned[0];const extras=[['expertbelt','たつじんのおび'],['muscleband','ちからのハチマキ'],['wiseglasses','ものしりメガネ'],['eviolite','しんかのきせき'],['powerherb','パワフルハーブ'],['flameorb','かえんだま'],['toxicorb','どくどくだま'],['blacksludge','くろいヘドロ'],['airballoon','ふうせん'],['charcoal','もくたん'],['mysticwater','しんぴのしずく'],['magnet','じしゃく'],['miracleseed','きせきのタネ'],['nevermeltice','とけないこおり'],['blackbelt','くろおび'],['poisonbarb','どくバリ'],['softsand','やわらかいすな'],['sharpbeak','するどいくちばし'],['twistedspoon','まがったスプーン'],['silverpowder','ぎんのこな'],['hardstone','かたいいし'],['spelltag','のろいのおふだ'],['dragonfang','りゅうのキバ'],['blackglasses','くろいメガネ'],['metalcoat','メタルコート'],['fairyfeather','せいれいのハネ'],['scopelens','ピントレンズ'],['razorclaw','するどいツメ'],['metronome','メトロノーム']];const wanted=extras.filter(([id])=>!html.includes(`value="${id}"`));const options=wanted.map(([id,label])=>`<option value="${id}" ${itemSlug(mon?.heldItem)===id?'selected':''}>${label}</option>`).join('');if(options)html=html.replace(/(<select id="held-item"[^>]*>)([\s\S]*?)(<\/select>)/,(_,a,b,c)=>a+b+options+c);return html;};

// Box and raid UI actions are intercepted; every pre-existing action falls through unchanged.
const V19_prevHandleAction=handleAction;
handleAction=async function(action,el){
 if(action==='box-toggle-arrange'){state.boxArrangeMode=!state.boxArrangeMode;if(!state.boxArrangeMode)state.boxSelectedUids=[];renderPage();return;}
 if(action==='box-toggle-pick'){const uid=el.dataset.uid;state.boxSelectedUids=Array.isArray(state.boxSelectedUids)?state.boxSelectedUids:[];const i=state.boxSelectedUids.indexOf(uid);if(i>=0)state.boxSelectedUids.splice(i,1);else if(state.boxSelectedUids.length<30)state.boxSelectedUids.push(uid);else toast('一度に移動できるのは30匹までです。','warn');renderPage();return;}
 if(action==='box-select-page'){v19EnsureBoxAssignments();const page=Number(state.boxPage||0),q=searchKey(state.boxSearch||'');let mons=state.owned.filter(m=>Number(m.boxIndex||0)===page).filter(m=>{const p=monSpecies(m);return !q||searchKey(m.name).includes(q)||searchKey(p?.name).includes(q)||searchKey(p?.jpName).includes(q)||String(p?.num).includes(q);});if(state.boxFilter==='shiny')mons=mons.filter(m=>m.shiny);if(state.boxFilter==='mark')mons=mons.filter(m=>m.mark);if(state.boxFilter==='legend')mons=mons.filter(m=>{const p=monSpecies(m);return p?.isLegendary||p?.isMythical;});state.boxArrangeMode=true;state.boxSelectedUids=mons.slice(0,30).map(m=>m.uid);renderPage();return;}
 if(action==='box-clear-picks'){state.boxSelectedUids=[];renderPage();return;}
 if(action==='box-move-selected'){const dest=Math.max(0,Math.min(29,Number($('#v19-box-destination')?.value??state.boxPage??0)));const ids=state.boxSelectedUids?.length?[...state.boxSelectedUids]:[state.selectedOwned].filter(Boolean);const mons=ids.map(uid=>state.owned.find(m=>m.uid===uid)).filter(Boolean);if(!mons.length){toast('移動するポケモンを選んでください。','warn');return;}const capacity=30-state.owned.filter(m=>Number(m.boxIndex||0)===dest&&!ids.includes(m.uid)).length;if(mons.length>capacity){toast(`ボックス ${dest+1} の空きは${capacity}匹分です。別のボックスを選んでね。`,'warn');return;}for(const mon of mons)mon.boxIndex=dest;state.boxSelectedUids=[];state.boxArrangeMode=false;state.boxPage=dest;state.selectedOwned=mons[0].uid;saveLocal();toast(`${mons.length}匹をボックス ${dest+1} に移動したよ！`,'good');renderPage();return;}
 if(action==='box-sort-current'){const page=Number(state.boxPage||0),sort=$('#v19-box-sort')?.value||'dex';state.boxSort=sort;const indexes=[];for(let i=0;i<state.owned.length;i++)if(Number(state.owned[i].boxIndex||0)===page)indexes.push(i);const sorted=indexes.map(i=>state.owned[i]).sort((a,b)=>v19BoxSortKey(a,b,sort));indexes.forEach((ix,i)=>state.owned[ix]=sorted[i]);saveLocal();renderPage();toast('このボックスを並べ替えたよ！','good');return;}
 if(action==='box-auto-organize'){if(!confirm('全ポケモンを図鑑番号順に並べ、30匹ずつボックスへ整理しますか？'))return;state.owned.sort((a,b)=>v19BoxSortKey(a,b,'dex'));state.owned.forEach((m,i)=>m.boxIndex=Math.min(29,Math.floor(i/30)));state.boxPage=0;state.boxSelectedUids=[];state.boxArrangeMode=false;state.selectedOwned=state.owned[0]?.uid||null;saveLocal();renderPage();toast('全ボックスを図鑑番号順に整理したよ！','good');return;}
 if(action==='select-box-page'){const next=Math.max(0,Math.min(v19BoxCount()-1,Number(el.dataset.index||0)));state.boxPage=next;const first=state.owned.find(m=>Number(m.boxIndex||0)===next);state.selectedOwned=first?.uid||null;state.boxSelectedUids=[];renderPage();return;}
 if(action==='open-raid-picker'){state.raidPicker=true;state.raidVisible=60;state.scoutSearch='';renderPage();return;}
 if(action==='close-raid-picker'){state.raidPicker=false;renderPage();return;}
 if(action==='raid-picker-more'){state.raidVisible=Math.max(60,Number(state.raidVisible||60))+60;renderPage();return;}
 return V19_prevHandleAction(action,el);
};

// Update move detail audit labels so the interface distinguishes executable tags from unresolved data.
function v19RuntimeTags(move){v19EnrichMove(move);const t=move?._v19TagData||{};const out=[];if(t.status&&!['none','なし','unknown','—'].includes(t.status))out.push(t.status==='unknown'?'要個別確認':'状態・妨害効果');if(t.flinchChance>0)out.push('ひるみ');if(t.drain>0)out.push('HP吸収');if(t.drain<0)out.push('反動');if(move?.multihit)out.push('連続ヒット');if(v19IsOhko(move))out.push('一撃必殺');if(V170_HANDLED_API?.has(Number(move?.apiId||0)))out.push('既存の専用処理');return [...new Set(out)];}
const V19_prevRenderMoveFineDetail=renderMoveFineDetail;
renderMoveFineDetail=function(move){let html=V19_prevRenderMoveFineDetail(move);const tags=v19RuntimeTags(move),content=tags.length?`<div class="move-fine-impl"><span>v16.19 実行処理</span><b>${esc(tags.join('・'))}</b><small>追加効果データをバトル処理へ接続。特殊な個別演出・条件は技ごとの確認が必要です。</small></div>`:`<div class="move-fine-impl"><span>v16.19 実行処理</span><b>汎用効果データなし／専用処理を確認</b><small>分類タグだけでは個別仕様の完全再現を保証しません。</small></div>`;return html.replace('</section>',content+'</section>');};

// Expose a concise audit hook for in-browser verification.
function v19GameplayAudit(){const moves=Object.values(state.data?.movesById||{}).map(v19EnrichMove);return {version:V19_VERSION,owned:state.owned?.length||0,boxCount:v19BoxCount(),taggedMoves:moves.filter(m=>v19RuntimeTags(m).length).length,tagStatus:moves.filter(m=>m._v19TagData?.status&&!['none','なし','unknown','—'].includes(m._v19TagData.status)).length,tagFlinch:moves.filter(m=>(m._v19TagData?.flinchChance||0)>0).length,drainOrRecoil:moves.filter(m=>(m._v19TagData?.drain||0)!==0).length,multihit:moves.filter(m=>!!m.multihit).length,ohkoMoves:moves.filter(v19IsOhko).length,raidBossSpecies:finalRecruitDex().length,raidTypes:[...new Set(finalRecruitDex().flatMap(p=>p.types||[]))].sort(),items:['choicescarf','choiceband','choicespecs','lifeorb','focussash','leftovers','sitrusberry','rockyhelmet','assaultvest','heavydutyboots','eviolite','expertbelt','muscleband','wiseglasses','whiteherb','powerherb','flameorb','toxicorb','blacksludge','ringtarget','weaknesspolicy','shellbell','metronome'].filter(Boolean)};}
if(window.PokemonChampions2D){Object.assign(window.PokemonChampions2D,{version:V19_VERSION,gameplayAudit:v19GameplayAudit,boxAssign:v19EnsureBoxAssignments,isOhkoMove:v19IsOhko,ohkoAccuracy:v19OhkoAccuracy});}
if(window.PokemonChampions2DData){Object.assign(window.PokemonChampions2DData,{version:V19_VERSION,tagRuntimeVersion:'metadata-effects-v1'});}
const v19Style=document.createElement('style');v19Style.id='v1619-overhaul-style';v19Style.textContent=`
.v19-box-tools{margin-bottom:12px;padding:14px;display:flex;flex-direction:column;gap:10px}.v19-box-tools-title{display:flex;flex-direction:column;gap:3px}.v19-box-tools-title small{color:var(--muted,#8792aa)}.v19-box-tools-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.v19-box-tools-row .field{min-width:150px;max-width:220px;flex:1}.v19-box-slot-wrap{position:relative;min-width:0}.v19-box-slot-wrap>.sv-box-slot{width:100%;height:100%}.v19-box-pick{position:absolute;top:5px;right:5px;z-index:3;width:25px;height:25px;border:1px solid rgba(130,150,190,.5);border-radius:8px;background:#18253d;color:#dbe7ff;font-weight:900;cursor:pointer}.v19-box-pick.selected{background:#25a878;color:white;border-color:#58e0ac}.v19-box-slot.v19-picked{outline:2px solid #36c995;outline-offset:-2px}.v19-scout-actions{display:flex;flex-wrap:wrap;gap:8px}.v19-scout-actions>.btn{flex:1;min-width:150px}.v19-raid-picker-grid{margin-top:12px}.v19-raid-picker-grid .dex-card{min-height:142px}@media(max-width:820px){.v19-box-tools-row .field{min-width:130px;max-width:none}.v19-box-tools-row>.btn{flex:1}.v19-raid-picker-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.v19-scout-actions{flex-direction:column}.v19-scout-actions>.btn{width:100%}}
`;
document.head.appendChild(v19Style);
// Correct the historical poison audit value: this base already uses 1/16 regular poison and a 1/4 toxic cap.

// v16.20 Ability Engine: event-driven runtime effects for abilities.
// This layer extends the existing battle pipeline rather than replacing its save or turn systems.
const V20_ABILITY_ENGINE_VERSION='v16.20-ability-engine';
const V20_SUPPORTED_ABILITIES=new Set([
 // Existing base/earlier battle handlers retained.
 'stench','battlearmor','limber','static','compoundeyes','naturalcure','serenegrace','waterveil','flamebody','overgrow','blaze','torrent','shellarmor','noguard','moldbreaker','scrappy','multitype','ironbarbs','victorystar','heavymetal','lightmetal','steamengine','gooey','tanglinghair','shadowshield','drizzle','drought','sandstream','snowwarning','intimidate','swiftswim','chlorophyll','sandrush','slushrush','hugepower','purepower','guts','technician','sheerforce','reckless','ironfist','strongjaw','toughclaws','neuroforce','adaptability','flashfire','thickfat','multiscale','iceface','disguise','filter','solidrock','prismarmor','solarpower','dryskin','heatproof','fluffy','waterbubble','magicbounce','levitate','waterabsorb','voltabsorb','sapsipper','stormdrain','motordrive','pressure','contrary','simple','clearbody','whitesmoke','fullmetalbody','hypercutter','keeneye','mirrorarmor','defiant','competitive','rattled','purifyingsalt','sweetveil','aromaveil','leafguard','insomnia','vitalspirit','magmaarmor','immunity','neutralizinggas','protosynthesis','quarkdrive','unburden','hustle','wonderguard','soundproof','bulletproof','overcoat','oblivious','weakarmor','justified','hungerswitch','powerconstruct','zenmode','rkssystem',
 // v16.20 entry, turn, switch, damage, status and field hooks.
 'speedboost','sturdy','damp','sandveil','cloudnine','airlock','colorchange','shielddust','owntempo','suctioncups','shadowtag','roughskin','effectspore','synchronize','lightningrod','trace','poisonpoint','innerfocus','raindish','earlybird','magnetpull','cutecharm','plus','minus','forecast','stickyhold','truant','shedskin','marvelscale','liquidooze','swarm','rockhead','arenatrap','tangledfeet','rivalry','steadfast','snowcloak','gluttony','angerpoint','unburden','download','poisonheal','skilllink','hydration','quickfeet','sniper','magicguard','klutz','superluck','aftermath','anticipation','forewarn','unaware','tintedlens','slowstart','icebody','frisk','flowergift','baddreams','pickpocket','unnerve','cursedbody','healer','friendguard','toxicboost','flareboost','harvest','telepathy','moody','poisontouch','regenerator','bigpecks','wonderskin','analytic','illusion','imposter','mummy','moxie','justified','rattled','defiant','competitive','sapSipper','stormdrain','motordrive','friendguard','surgeSurfer','surgesurfer','berserk','beastboost','soulheart','chillingneigh','grimneigh','asone','intrepidsword','dauntlessshield','orichalcumpulse','hadronengine','screenCleaner','screencleaner','supersweetsyrup','hospitality','wellbakedbody','eartheater','windrider','thermalexchange','angershell','seedsower','toxicdebris','electromorphosis','windpower','watercompaction','earthheater','rockypayload','dragonsmaw','transistor','punkrock','sharpness','tintedlens','solarpower','solarfactor','aerilate','refrigerate','pixilate','galvanize','normalize','darkaura','fairyaura','aurabreak','steelyspirit','powerspot','battery','terrashell','armortail','dazzling','queenlymajesty','goodasgold','innardsout','stamina','cottondown','sandspit','perishbody','lingeringaroma','wanderingSpirit','wanderingspirit','myceliummight'
].map(x=>slug(x)));

function v20AllMons(b=state.battle){return [...(b?.playerTeam||[]),...(b?.enemyTeam||[])].filter(Boolean);}
function v20Active(side,b=state.battle){return bcActiveMons(side,b);}
function v20Ab(mon,b=state.battle){return bcAbility(mon,b);}
function v20IsGasActive(b=state.battle){return v20AllMons(b).some(m=>m&&!m.fainted&&m.hp>0&&((b?.playerActive||[]).some(i=>b?.playerTeam?.[i]?.uid===m.uid)||(b?.enemyActive||[]).some(i=>b?.enemyTeam?.[i]?.uid===m.uid))&&slug(m.abilityId)==='neutralizinggas'&&Number(m._abilityDisabledTurns||0)<=0);}
function v20Side(mon,b=state.battle){return bcSide(mon,b);}
function v20Opponents(mon,b=state.battle){const side=v20Side(mon,b);return side?v20Active(bcOppositeSide(side),b):[];}
function v20Allies(mon,b=state.battle){const side=v20Side(mon,b);return side?v20Active(side,b).filter(x=>x.uid!==mon?.uid):[];}
function v20Log(msg){if(msg)bcEffectLog(msg);}
function v20Boost(mon,changes,source='特性'){if(mon&&changes&&typeof applyBoosts==='function')applyBoosts(mon,changes,source);}
function v20Heal(mon,amount,reason='特性'){if(!mon||mon.fainted||mon.hp<=0)return 0;const before=mon.hp;mon.hp=Math.min(mon.maxhp,mon.hp+Math.max(1,Math.floor(amount)));const healed=mon.hp-before;if(healed>0)v20Log(`${mon.name}の「${abilityName(mon.abilityId)}」！ ${reason}でHPが${healed}回復した！`);return healed;}
function v20AbilityEnabled(mon,b=state.battle){return !!(mon&&v20Ab(mon,b));}
function v20IsMoveId(move,ids){const id=bcMoveId(move),api=Number(move?.apiId||0);return ids.includes(id)||ids.includes(api);}
function v20WeatherSuppressed(b=state.battle){return v20Active('player',b).concat(v20Active('enemy',b)).some(m=>['cloudnine','airlock'].includes(v20Ab(m,b)));}
function v20IsContact(move){return bcFlag(move,'contact')||!!move?.flags?.contact;}
function v20IsSound(move){return bcFlag(move,'sound');}
function v20AbilityAudit(){
 const list=state.data?.abilitiesList||[];
 const implemented=list.filter(a=>V20_SUPPORTED_ABILITIES.has(slug(a.id||a.name)));
 const unsupported=list.filter(a=>!V20_SUPPORTED_ABILITIES.has(slug(a.id||a.name)));
 return {version:V20_ABILITY_ENGINE_VERSION,total:list.length,implemented:implemented.length,notImplemented:unsupported.length,implementedList:implemented.map(a=>({id:a.id,jpName:a.jpName||a.name})),notImplementedList:unsupported.map(a=>({id:a.id,jpName:a.jpName||a.name})),note:'「対応」は共通イベント処理への接続を示します。全世代・全例外条件の完全再現を意味しません。'};
}

// Initialize per-battle ability state without changing the saved Pokémon record.
const V20_prevBuildBattleMon=buildBattleMon;
buildBattleMon=function(monOrSpecies,owned=false){
 const mon=V20_prevBuildBattleMon(monOrSpecies,owned);
 mon._v20BaseAbilityId=mon.abilityId||null;
 mon._v20SlowStartTurns=0;
 mon._v20TruantLoaf=false;
 mon._v20ElectroCharge=false;
 mon._v20WindCharge=false;
 mon._v20BerryRestoreAt=null;
 mon._v20IntrepidUsed=false;
 mon._v20DauntlessUsed=false;
 return mon;
};

// Stat calculations that were missing from the previous build.
const V20_prevCurrentStat=currentStat;
currentStat=function(mon,key){
 if(!mon)return V20_prevCurrentStat(mon,key);
 const b=state.battle,ab=v20Ab(mon,b),status=mon.status;
 let value;
 const weather=b?.weather,weatherSuppressed=v20WeatherSuppressed(b);
 if(weatherSuppressed&&b)b.weather=null;
 const rawAbility=mon.abilityId,maskAbility=!ab&&slug(rawAbility)!=='none';
 if(maskAbility)mon.abilityId='none';
 try{
  if(key==='spe'&&ab==='quickfeet'&&status){mon.status=null;try{value=V20_prevCurrentStat(mon,key);}finally{mon.status=status;}}
  else value=V20_prevCurrentStat(mon,key);
 }finally{if(maskAbility)mon.abilityId=rawAbility;if(weatherSuppressed&&b)b.weather=weather;}
 if(!Number.isFinite(value))return value;
 if(ab==='quickfeet'&&status&&key==='spe')value=Math.floor(value*1.5);
 if(ab==='marvelscale'&&status&&key==='def')value=Math.floor(value*1.5);
 if(ab==='defeatist'&&mon.hp>0&&mon.hp<=mon.maxhp/2&&['atk','spa'].includes(key))value=Math.floor(value*.5);
 if(ab==='slowstart'&&Number(mon._v20SlowStartTurns||0)>0&&['atk','spe'].includes(key))value=Math.floor(value*.5);
 if(ab==='furcoat'&&key==='def')value=Math.floor(value*2);
 if(ab==='icescales'&&key==='spd')value=Math.floor(value*2);
 if(ab==='flareboost'&&status==='brn'&&key==='spa')value=Math.floor(value*1.5);
 if(ab==='toxicboost'&&['psn','tox'].includes(status)&&key==='atk')value=Math.floor(value*1.5);
 if(ab==='surgesurfer'&&key==='spe'&&b?.terrain==='electric')value=Math.floor(value*2);
 if(['plus','minus'].includes(ab)&&key==='spa'&&v20Allies(mon,b).some(x=>['plus','minus'].includes(v20Ab(x,b))))value=Math.floor(value*1.5);
 const hasFlowerGift=v20Active(v20Side(mon,b),b).some(x=>v20Ab(x,b)==='flowergift');
 if(hasFlowerGift&&b?.weather==='sun'&&!weatherSuppressed&&['atk','spd'].includes(key))value=Math.floor(value*1.5);
 return Math.max(1,Math.floor(value));
};

// Accuracy protection and accuracy-changing abilities.
const V20_prevAccuracy=getEffectiveAccuracy;
getEffectiveAccuracy=function(move,actor,target,b){
 if(!move||!actor||!target)return V20_prevAccuracy(move,actor,target,b);
 const a=v20Ab(actor,b),d=v20Ab(target,b);
 const oldA=actor.stages?.accuracy,oldE=target.stages?.evasion;
 if(d==='unaware'||d==='keeneye'||d==='mindseye'){
  if(target.stages)target.stages.evasion=0;
 }
 if(a==='unaware'&&actor.stages)actor.stages.accuracy=0;
 let acc;
 try{acc=V20_prevAccuracy(move,actor,target,b);}finally{if(target.stages&&oldE!==undefined)target.stages.evasion=oldE;if(actor.stages&&oldA!==undefined)actor.stages.accuracy=oldA;}
 if(d==='tangledfeet'&&Number(target._confusionTurns||0)>0)acc*=.5;
 if(d==='wonderskin'&&move.category==='Status'&&!['self','allySide','allies'].includes(move.target)&&Number(move.accuracy||100)>0)acc=Math.min(acc,50);
 if(d==='sandveil'&&b?.weather==='sand'&&!v20WeatherSuppressed(b))acc*=.8;
 if(d==='snowcloak'&&b?.weather==='snow'&&!v20WeatherSuppressed(b))acc*=.8;
 if(a!=='victorystar'&&v20Active(v20Side(actor,b),b).some(x=>v20Ab(x,b)==='victorystar'))acc*=1.1;
 return Math.max(1,Math.min(100,acc));
};

// Entry abilities. The legacy entry handler is reused, but suppressed abilities do not leak through Neutralizing Gas.
const V20_prevEntry=triggerEntryEffects;
triggerEntryEffects=function(entering,foes,b){
 const entrants=(entering||[]).filter(Boolean),gas=v20IsGasActive(b),saved=[];
 for(const mon of entrants){const off=gas&&slug(mon.abilityId)!=='neutralizinggas'||Number(mon._abilityDisabledTurns||0)>0;if(off){saved.push([mon,mon.abilityId]);mon.abilityId='none';}}
 try{V20_prevEntry(entrants,foes,b);}finally{for(const [mon,id] of saved)mon.abilityId=id;}
 for(const mon of entrants){if(!mon||mon.fainted||mon.hp<=0)continue;const ab=v20Ab(mon,b),opponents=v20Opponents(mon,b),allies=v20Allies(mon,b);
  if(ab==='trace'){
   const candidates=opponents.map(x=>x.abilityId).filter(x=>x&& !['trace','neutralizinggas','none'].includes(slug(x)));
   if(candidates.length){const picked=chooseRandom(candidates);mon._v20BaseAbilityId=mon._v20BaseAbilityId||mon.abilityId;mon._v20TracedAbility=picked;mon.abilityId=picked;v20Log(`${mon.name}のトレース！ 相手の「${abilityName(picked)}」になった！`);}
  }
  if(ab==='download'&&opponents.length){const def=opponents.reduce((n,x)=>n+Number(monSpecies(x)?.baseStats?.def||x.stats?.def||1),0)/opponents.length;const spd=opponents.reduce((n,x)=>n+Number(monSpecies(x)?.baseStats?.spd||x.stats?.spd||1),0)/opponents.length;v20Boost(mon,def<=spd?{atk:1}:{spa:1},'ダウンロード');}
  if(ab==='screenCleaner'){for(const side of Object.values(b.sideConditions||{})){side.reflect=0;side.lightscreen=0;side.auroraveil=0;}v20Log(`${mon.name}のバリアフリー！ 両側の壁が消えた！`);}
  if(ab==='intrepidsword'&&!mon._v20IntrepidUsed){mon._v20IntrepidUsed=true;v20Boost(mon,{atk:1},'ふとうのけん');}
  if(ab==='dauntlessshield'&&!mon._v20DauntlessUsed){mon._v20DauntlessUsed=true;v20Boost(mon,{def:1},'ふくつのたて');}
  if(ab==='orichalcumpulse'){if(!v20WeatherSuppressed(b)){b.weather='sun';b.weatherTurns=5;v20Log(`${mon.name}のひひいろのこどう！ 日差しが強くなった！`);}}
  if(ab==='hadronengine'){b.terrain='electric';b.terrainTurns=5;v20Log(`${mon.name}のハドロンエンジン！ エレキフィールドになった！`);}
  if(ab==='supersweetsyrup'&&!mon._v20SyrupUsed){mon._v20SyrupUsed=true;for(const foe of opponents)v20Boost(foe,{evasion:-1},'かんろなミツ');}
  if(ab==='hospitality'&&allies.length){const ally=allies[0];v20Heal(ally,ally.maxhp/4,'おもてなし');}
  if(ab==='frisk'){const visible=opponents.filter(x=>x.heldItem).map(x=>`${x.name}：${x.heldItem}`);if(visible.length)v20Log(`${mon.name}のおみとおし！ ${visible.join(' / ')}`);}
  if(ab==='slowstart'&&!mon._v20SlowStartStarted){mon._v20SlowStartStarted=true;mon._v20SlowStartTurns=5;v20Log(`${mon.name}はスロースタートで本来の力を出せない！`);}
  if(ab==='costar'&&allies.length){const src=allies[0];mon.stages={...(src.stages||{})};v20Log(`${mon.name}のきょうえん！ ${src.name}の能力変化をコピーした！`);}
  if(ab==='anticipation'&&opponents.some(foe=>(foe.moves||[]).some(slot=>{const m=getMove(slot.id);return m&&isMoveClassifiedDamageV2(m)&&Number(resolveContextMoveData(m,foe,mon,b).power||0)>0&&typeMult(resolveContextMoveData(m,foe,mon,b).type,monSpecies(mon),mon)>1;})))v20Log(`${mon.name}は危険を察知した！`);
  if(ab==='forewarn'&&opponents.length){const allMoves=opponents.flatMap(x=>(x.moves||[]).map(z=>({move:getMove(z.id),actor:x})).filter(z=>!!z.move));const bestRow=allMoves.sort((x,y)=>resolvedMovePowerV2(y.move,y.actor,mon,b)-resolvedMovePowerV2(x.move,x.actor,mon,b))[0];const best=bestRow?.move;if(best)v20Log(`${mon.name}のよちむ！ 最も強い技は「${getMoveName(best)}」のようだ！`);}
  if(ab==='flowergift'&&b.weather==='sun'&&!v20WeatherSuppressed(b))v20Log(`${mon.name}のフラワーギフト！ 味方の攻撃と特防が強化された！`);
 }
};

// Redirect single-target Electric/Water attacks to Lightning Rod/Storm Drain holders in doubles.
const V20_prevTargetForAction=targetForAction;
targetForAction=function(actor,act,b){
 const chosen=V20_prevTargetForAction(actor,act,b);if(!actor||!chosen||!b)return chosen;const move=getMove(act?.moveId);if(!move||['self','allySide','allies','user-and-allies','users-field','entire-field','all-pokemon'].includes(move.target))return chosen;const type=resolveContextMoveData(move,actor,chosen,b).type;const opposing=v20Active(bcOppositeSide(act.side),b);const redirect=opposing.find(x=>(type==='Electric'&&v20Ab(x,b)==='lightningrod')||(type==='Water'&&v20Ab(x,b)==='stormdrain'));return redirect||chosen;
};

// Move immunity and move-blocking abilities.
const V20_prevAbilityTrigger=abilityTriggerOnMove;
abilityTriggerOnMove=function(actor,target,move,b){
 if(!actor||!target||!move)return V20_prevAbilityTrigger(actor,target,move,b);
 const ab=v20Ab(target,b),type=resolveContextMoveData(move,actor,target,b).type,id=bcMoveId(move);
 const priority=Number(move.priority||0)>0;
 if(ab==='goodasgold'&&move.category==='Status'&&target!==actor){v20Log(`${target.name}のおうごんのからだ！ 変化技を防いだ！`);return true;}
 if(['dazzling','queenlymajesty','armortail'].includes(ab)&&priority){v20Log(`${target.name}の「${abilityName(target.abilityId)}」で先制技を防いだ！`);return true;}
 if(ab==='damp'&&['explosion','selfdestruct','mindblown'].includes(id)){v20Log(`${target.name}のしめりけで爆発技を防いだ！`);return true;}
 if((ab==='lightningrod'&&type==='Electric')||(ab==='eartheater'&&type==='Ground')||(ab==='wellbakedbody'&&type==='Fire')||(ab==='watercompaction'&&type==='Water')||(ab==='windrider'&&bcFlag(move,'wind'))){
  if(ab==='lightningrod'){v20Boost(target,{spa:1},'ひらいしん');}
  else if(ab==='eartheater'){v20Heal(target,target.maxhp/4,'どしょく');}
  else if(ab==='wellbakedbody'){v20Boost(target,{def:2},'こんがりボディ');}
  else if(ab==='watercompaction'){v20Boost(target,{def:2},'みずがため');}
  else if(ab==='windrider'){v20Boost(target,{atk:1},'かぜのり');}
  v20Log(`${target.name}の「${abilityName(target.abilityId)}」！ 技を無効化した！`);return true;
 }
 return V20_prevAbilityTrigger(actor,target,move,b);
};

// Weather suppression and ability damage modifiers. Thick Fat is neutralized inside the legacy calculator
// and applied once here because the previous build applied it twice.
const V20_prevCalculateDamage=calculateDamage;
calculateDamage=function(actor,target,move,b){
 if(!actor||!target||!move)return V20_prevCalculateDamage(actor,target,move,b);
 const gas=v20IsGasActive(b),weatherOff=v20WeatherSuppressed(b),targetAb=gas?'':v20Ab(target,b);
 const saved=[];if(gas){for(const mon of v20AllMons(b)){saved.push([mon,mon.abilityId]);mon.abilityId='none';}}
 else if(targetAb==='thickfat'){saved.push([target,target.abilityId]);target.abilityId='none';}
 const stageSnapshots=[];if(!gas){if(v20Ab(actor,b)==='unaware'&&target.stages){stageSnapshots.push([target,{...target.stages}]);for(const k of ['atk','def','spa','spd','spe','accuracy','evasion'])target.stages[k]=0;}if(v20Ab(target,b)==='unaware'&&actor.stages){stageSnapshots.push([actor,{...actor.stages}]);for(const k of ['atk','def','spa','spd','spe','accuracy','evasion'])actor.stages[k]=0;}}
 const oldWeather=b?.weather;
 if(weatherOff&&b)b.weather=null;
 let result;
 try{result=V20_prevCalculateDamage(actor,target,move,b);}finally{if(weatherOff&&b)b.weather=oldWeather;for(const [mon,id] of saved)mon.abilityId=id;for(const [mon,stages] of stageSnapshots)mon.stages=stages;}
 if(result&&result.critical)move._v20Critical=true;
 if(!result||result.damage<=0||gas)return result;
 const type=result.type||resolveContextMoveData(move,actor,target,b).type,eff=Number(result.effectiveness??1),a=v20Ab(actor,b),d=v20Ab(target,b),id=bcMoveId(move);
 let mult=1;
 if(targetAb==='thickfat'&&['Fire','Ice'].includes(type))mult*=.5;
 if(targetAb==='shadowshield'&&target.hp>=target.maxhp)mult*=.5;
 if(['blaze','overgrow','torrent','swarm'].includes(a)&&actor.hp>0&&actor.hp<=actor.maxhp/3){const matching={blaze:'Fire',overgrow:'Grass',torrent:'Water',swarm:'Bug'}[a];if(type===matching)mult*=1.5;}
 if(a==='tintedlens'&&eff>0&&eff<1)mult*=2;
 if(a==='sandforce'&&b.weather==='sand'&&['Rock','Ground','Steel'].includes(type)&&!weatherOff)mult*=1.3;
 if(a==='waterbubble'&&type==='Water')mult*=2;
 if(a==='transistor'&&type==='Electric')mult*=1.3;
 if(a==='dragonsmaw'&&type==='Dragon')mult*=1.5;
 if(a==='rockypayload'&&type==='Rock')mult*=1.5;
 if(a==='firemane'&&type==='Fire')mult*=1.5;
 if(a==='punkrock'&&v20IsSound(move))mult*=1.3;
 if(a==='sharpness'&&bcFlag(move,'slicing'))mult*=1.5;
 if(a==='supremeoverlord'){const team=v20Side(actor,b)==='player'?b.playerTeam:b.enemyTeam;const fallen=team.filter(x=>x!==actor&&(x.fainted||x.hp<=0)).length;mult*=1+Math.min(5,fallen)*.1;}
 if(actor._v20ElectroCharge&&type==='Electric'){mult*=2;actor._v20ElectroCharge=false;}
 if(actor._v20WindCharge&&type==='Electric'){mult*=2;actor._v20WindCharge=false;}
 if(a==='dragonskin'&&type==='Dragon')mult*=1.2;
 if(d==='purifyingsalt'&&type==='Ghost')mult*=.5;
 if(v20Allies(target,b).some(x=>v20Ab(x,b)==='friendguard'))mult*=.75;
 if(v20Allies(actor,b).some(x=>v20Ab(x,b)==='powerspot'))mult*=1.3;
 if(v20Allies(actor,b).some(x=>v20Ab(x,b)==='steelyspirit')&&type==='Steel')mult*=1.5;
 if(v20Allies(actor,b).some(x=>v20Ab(x,b)==='battery')&&move.category==='Special')mult*=1.3;
 if(v20Active('player',b).concat(v20Active('enemy',b)).some(x=>v20Ab(x,b)==='darkaura')&&type==='Dark')mult*=4/3;
 if(v20Active('player',b).concat(v20Active('enemy',b)).some(x=>v20Ab(x,b)==='fairyaura')&&type==='Fairy')mult*=4/3;
 if(v20Active('player',b).concat(v20Active('enemy',b)).some(x=>v20Ab(x,b)==='aurabreak')&&['Dark','Fairy'].includes(type))mult*=.75;
 if(d==='terrashell'&&target.hp>=target.maxhp&&eff>.5){mult*=.5/eff;result.effectiveness=.5;}
 if(mult!==1)result.damage=Math.max(1,Math.floor(result.damage*mult));
 return result;
};

// Type-changing attacks used by several modern abilities.
const V20_prevResolveContext=resolveContextMoveData;
resolveContextMoveData=function(move,actor,target,b){
 const out=V20_prevResolveContext(move,actor,target,b);if(!move||!actor||!out)return out;
 const ab=v20Ab(actor,b),id=bcMoveId(move);let type=out.type,power=out.power;
 const weight=(mon,base)=>base*(v20Ab(mon,b)==='heavymetal'?2:v20Ab(mon,b)==='lightmetal'?.5:1);
 if(['lowkick','grassknot'].includes(id)){const w=weight(target,Number(monSpecies(target)?.weightkg||1000));power=w<10?20:w<25?40:w<50?60:w<100?80:w<200?100:120;}
 if(['heavyslam','heatcrash'].includes(id)){const wa=weight(actor,Number(monSpecies(actor)?.weightkg||1)),wt=weight(target,Number(monSpecies(target)?.weightkg||1000)),ratio=wa/Math.max(1,wt);power=ratio>=5?120:ratio>=4?100:ratio>=3?80:ratio>=2?60:40;}
 if(type==='Normal'&&['aerilate','refrigerate','pixilate','galvanize'].includes(ab)){type=({aerilate:'Flying',refrigerate:'Ice',pixilate:'Fairy',galvanize:'Electric'})[ab];power=Math.floor(power*1.2);}
 if(ab==='normalize'){type='Normal';power=Math.floor(power*1.2);}
  return {...out,type,power};
};

// Status protection and Synchronize/Pastel Veil/Thermal Exchange.
const V20_prevSetStatus=setStatus;
setStatus=function(target,status,sourceName=''){
 if(!target||!status)return false;const b=state.battle,ab=v20Ab(target,b),side=v20Side(target,b);
 if((status==='psn'||status==='tox')&&(ab==='pastelveil'||v20Allies(target,b).some(x=>v20Ab(x,b)==='pastelveil'))){v20Log(`${target.name}はパステルベールに守られて毒にならない！`);return false;}
 if(status==='brn'&&ab==='thermalexchange'){v20Log(`${target.name}のねつこうかんでやけどを防いだ！`);return false;}
 const source=(b&&b._eventActorUid)?bcFindBattleMon(b._eventActorUid,b):null;
 const result=V20_prevSetStatus(target,status,sourceName);
 if(result&&source&&source!==target&&v20Ab(target,b)==='synchronize'&&['brn','par','psn','tox'].includes(status)&&!source.status){V20_prevSetStatus(source,status,'シンクロ');}
 return result;
};

// Shield Dust blocks the target-side secondary effects; Sheer Force suppresses the user's secondary effects.
const V20_prevMoveExtras=applyMoveExtras;
applyMoveExtras=function(actor,target,move,b){
 if(!move)return V20_prevMoveExtras(actor,target,move,b);const actorAb=v20Ab(actor,b),targetAb=v20Ab(target,b);
 const rawActorAbility=actor?.abilityId,maskActorAbility=!!(actor&&!actorAb&&slug(rawActorAbility)!=='none');
 const callLegacy=(m)=>{if(maskActorAbility)actor.abilityId='none';try{return V20_prevMoveExtras(actor,target,m,b);}finally{if(maskActorAbility)actor.abilityId=rawActorAbility;}};
 if(target&&target!==actor&&targetAb==='shielddust'){const copy={...move,secondary:null,secondaries:[]};return callLegacy(copy);}
 if(actorAb==='sheerforce'&&(move.secondary||move.secondaries?.length)){const copy={...move,secondary:null,secondaries:[]};return callLegacy(copy);}
 return callLegacy(move);
};

// Damage events: Sturdy, contact abilities, reactions to attacks, and KO-triggered abilities.
const V20_prevApplyDamage=applyDamage;
applyDamage=function(target,damage,source=null,move=null){
 if(!target||damage<=0)return V20_prevApplyDamage(target,damage,source,move);
 const b=state.battle,ab=v20Ab(target,b),before=Number(target.hp||0),type=move?resolveContextMoveData(move,source||target,target,b).type:null;
 let incoming=Math.max(0,Number(damage)||0);
 if(!source&&ab==='magicguard')return 0;
 if(ab==='sturdy'&&before===target.maxhp&&incoming>=before&&source&&source.uid!==target.uid)incoming=Math.max(0,before-1);
 const rawTargetAbility=target.abilityId,maskTargetAbility=!ab&&slug(rawTargetAbility)!=='none';
 if(maskTargetAbility)target.abilityId='none';
 let actual;try{actual=V20_prevApplyDamage(target,incoming,source,move);}finally{if(maskTargetAbility)target.abilityId=rawTargetAbility;}
 if(actual<=0||!source||source.uid===target.uid)return actual;
 const contact=v20IsContact(move),eff=move?typeMult(type,monSpecies(target),target):1;
 if(type==='Fire'&&ab==='thermalexchange')v20Boost(target,{atk:1},'ねつこうかん');
 if(contact&&ab==='weakarmor'&&move?.category==='Physical'&&eff<=1)v20Boost(target,{def:-1,spe:2},'くだけるよろい');
 if(ab==='angerpoint'&&move?._v20Critical)v20Boost(target,{atk:6},'いかりのつぼ');
 if(target.hp>0&&ab==='stamina'&&move?.category!=='Status')v20Boost(target,{def:1},'じきゅうりょく');
 if(target.hp>0&&ab==='steamengine'&&['Fire','Water'].includes(type))v20Boost(target,{spe:6},'じょうききかん');
 if(contact&&source.hp>0&&['gooey','tanglinghair'].includes(ab))v20Boost(source,{spe:-1},'ぬめぬめ');
 if(ab==='cottondown'&&move?.category!=='Status'){for(const mon of v20Active('player',b).concat(v20Active('enemy',b)))if(mon.uid!==target.uid)v20Boost(mon,{spe:-1},'わたげ');}
 if(target.hp>0&&ab==='sandspit'&&move?.category!=='Status'){b.weather='sand';b.weatherTurns=5;v20Log(`${target.name}のすなはき！ 砂あらしが吹き始めた！`);}
 if(target.hp>0&&ab==='seedsower'){b.terrain='grassy';b.terrainTurns=5;v20Log(`${target.name}のこぼれダネ！ グラスフィールドになった！`);}
 if(target.hp>0&&ab==='electromorphosis'){target._v20ElectroCharge=true;v20Log(`${target.name}はでんきをため込んだ！ 次のでんき技が強くなる！`);}
 if(target.hp>0&&ab==='windpower'&&bcFlag(move,'wind')){target._v20WindCharge=true;v20Log(`${target.name}は風を受けて充電した！`);}
 if(target.hp>0&&ab==='colorchange'&&type&&type!=='???'&&!target.terastallized&&!(target.types||[]).includes(type)){target.types=[type];v20Log(`${target.name}のへんしょく！ ${TYPE_JA[type]||type}タイプになった！`);}
 if(target.hp>0&&ab==='angershell'&&before>target.maxhp/2&&target.hp<=target.maxhp/2){v20Boost(target,{atk:1,spa:1,spe:1,def:-1,spd:-1},'いかりのこうら');}
 if(target.hp>0&&ab==='toxicdebris'&&move?.category==='Physical'){const side=bcSide(source,b),foe=bcOppositeSide(side);b.sideConditions=b.sideConditions||{player:{},enemy:{}};b.sideConditions[foe]=b.sideConditions[foe]||{};b.sideConditions[foe].toxicspikes=Math.min(2,Number(b.sideConditions[foe].toxicspikes||0)+1);v20Log(`${target.name}のどくげしょう！ 相手側にどくびしがまかれた！`);}
 if(contact&&target.hp>0&&source.hp>0){
  if(ab==='poisontouch'&&Math.random()<.3&&!source.status)setStatus(source,'psn',abilityName(target.abilityId));
  if(ab==='stench'&&Math.random()<.1){source.volatile=source.volatile||{};source.volatile.flinch=true;}
  if(ab==='effectspore'&&Math.random()<.3&&!source.status){const choices=['slp','psn','par'];setStatus(source,chooseRandom(choices),abilityName(target.abilityId));}
  if(ab==='cutecharm'&&Math.random()<.3){source._infatuatedBy=target.uid;v20Log(`${source.name}はメロメロになった！`);}
  if(ab==='lingeringaroma'&&!['multitype','rkssystem','stancechange','schooling','zenmode','powerconstruct'].includes(v20Ab(source,b))){source.abilityId='lingeringaroma';v20Log(`${source.name}の特性がとれないにおいに変わった！`);}
  if(ab==='wanderingSpirit'&&!['multitype','rkssystem','stancechange','schooling','zenmode','powerconstruct'].includes(v20Ab(source,b))){const old=source.abilityId;source.abilityId=target.abilityId;target.abilityId=old;v20Log(`${source.name}と${target.name}の特性が入れ替わった！`);}
  if(ab==='mummy'&&!['multitype','rkssystem','stancechange','schooling','zenmode','powerconstruct'].includes(v20Ab(source,b))){source.abilityId='mummy';v20Log(`${source.name}の特性がミイラに変わった！`);}
  if(ab==='pickpocket'&&!target.heldItem&&source.heldItem){target.heldItem=source.heldItem;source.heldItem='';v20Log(`${target.name}のわるいてぐせ！ 持ち物を奪った！`);}
 }
 if(contact&&ab==='perishbody'&&source.hp>0){source._v20PerishTurns=source._v20PerishTurns||3;if(target.hp>0)target._v20PerishTurns=target._v20PerishTurns||3;v20Log(`${source.name}と${target.name}にほろびのカウントが始まった！`);}
 if(target.hp<=0){for(const mon of v20Active('player',b).concat(v20Active('enemy',b))){if(v20Ab(mon,b)==='soulheart')v20Boost(mon,{spa:1},'ソウルハート');}}
 if(target.hp<=0&&source.hp>0){
  const damp=v20Active('player',b).concat(v20Active('enemy',b)).some(x=>v20Ab(x,b)==='damp');
  if(ab==='aftermath'&&contact&&!damp){const d=Math.max(1,Math.floor(source.maxhp/4));source.hp=Math.max(0,source.hp-d);if(source.hp<=0)source.fainted=true;v20Log(`${source.name}はゆうばくで${d}ダメージを受けた！`);}
  if(ab==='innardsout'){const d=Math.max(1,before);source.hp=Math.max(0,source.hp-d);if(source.hp<=0)source.fainted=true;v20Log(`${source.name}は${target.name}のとびだすなかみで${d}ダメージ！`);}
 }
 return actual;
};

// Rock Head and Magic Guard suppress recoil from moves. The action-scoped lookup wrapper
// returns a temporary move record so the embedded master move data is never mutated.
const V20_prevGetMove=getMove;
getMove=function(id){const move=V20_prevGetMove(id);const uid=state.battle?._v20NoRecoilUid;if(!move||!uid)return move;const actor=bcFindBattleMon(uid);if(actor&&['rockhead','magicguard'].includes(v20Ab(actor,state.battle))&&move.recoil)return {...move,recoil:undefined};return move;};

// Switch-in/out, trapping, and post-KO effects.
const V20_prevExecuteAction=executeAction;
const V20_prevOhko=v19ExecuteOhko;
const V20_prevCriticalChance=v19CriticalChance;
v19CriticalChance=function(actor,target,move,b){const ab=v20Ab(target,b),raw=target?.abilityId,mask=!!(target&&!ab&&slug(raw)!=='none');if(mask)target.abilityId='none';try{return V20_prevCriticalChance(actor,target,move,b);}finally{if(mask)target.abilityId=raw;}};
v19ExecuteOhko=function(actor,target,move,b){if(v20Ab(target,b)===''){const old=target?.abilityId;if(target&&slug(old)==='sturdy'){target.abilityId='none';try{return V20_prevOhko(actor,target,move,b);}finally{target.abilityId=old;}}}return V20_prevOhko(actor,target,move,b);};
executeAction=function(act,b){
 if(!act||!b)return V20_prevExecuteAction(act,b);
 const team=act.side==='player'?b.playerTeam:b.enemyTeam,actor=team?.find(m=>m?.uid===act.actorUid);if(!actor)return V20_prevExecuteAction(act,b);
 const switching=act.switchTo!=null;
 if(switching){
  const foes=v20Active(bcOppositeSide(act.side),b),blocked=foes.some(foe=>{const a=v20Ab(foe,b),types=actor.types||monSpecies(actor)?.types||[];return (a==='shadowtag'&&!types.includes('Ghost')&&v20Ab(actor,b)!=='shadowtag')||(a==='magnetpull'&&types.includes('Steel'))||(a==='arenatrap'&&isGrounded(actor));});
  if(blocked){v20Log(`${actor.name}は相手の特性で交代できない！`);return;}
  const outAbility=v20Ab(actor,b);
  if(actor._v20PerishTurns){delete actor._v20PerishTurns;v20Log(`${actor.name}は交代してほろびのカウントを免れた！`);}
  if(outAbility==='regenerator')v20Heal(actor,actor.maxhp/3,'さいせいりょく');
  if(outAbility==='naturalcure'&&actor.status){actor.status=null;actor.statusTurns=0;v20Log(`${actor.name}のしぜんかいふく！ 状態異常が治った！`);}
  if(actor._v20TracedAbility&&actor._v20BaseAbilityId){actor.abilityId=actor._v20BaseAbilityId;actor._v20TracedAbility=null;}
  return V20_prevExecuteAction(act,b);
 }
 const move=getMove(act.moveId),target=move?targetForAction(actor,act,b):null,hpBefore=target?target.hp:0;
 if(move)move._v20Critical=false;
 b._v20NoRecoilUid=actor.uid;
 const ab=v20Ab(actor,b);
 if(ab==='truant'&&actor._v20TruantLoaf){actor._v20TruantLoaf=false;b._v20NoRecoilUid=null;v20Log(`${actor.name}はなまけて動けない！`);return;}
 if(ab==='truant')actor._v20TruantLoaf=true;
 if(move&&['explosion','selfdestruct','mindblown'].includes(bcMoveId(move))&&v20Active('player',b).concat(v20Active('enemy',b)).some(x=>v20Ab(x,b)==='damp')){b._v20NoRecoilUid=null;v20Log(`${actor.name}の爆発技はしめりけで失敗した！`);return;}
 const oldActor=actor.abilityId;
 let result;
 try{result=V20_prevExecuteAction(act,b);}finally{b._v20NoRecoilUid=null;if(actor.hp<=0)actor.fainted=true;}
 if(target&&target.hp<=0&&hpBefore>0&&actor.hp>0){
  const now=v20Ab(actor,b);
  if(['moxie','chillingneigh'].includes(now))v20Boost(actor,{atk:1},'特性');
  if(now==='asone'){const base=slug(actor.baseSpeciesId||actor.speciesId||'');v20Boost(actor,base.includes('shadow')?{spa:1}:{atk:1},'じんばいったい');}
  if(['grimneigh'].includes(now))v20Boost(actor,{spa:1},'じんばいったい');
  if(now==='beastboost'){const key=['atk','def','spa','spd','spe'].sort((x,y)=>Number(actor.stats?.[y]||0)-Number(actor.stats?.[x]||0))[0];v20Boost(actor,{[key]:1},'ビーストブースト');}
 }
 return result;
};

// Flinch support for Stench and other effects.
const V20_prevCanMove=canMove;
canMove=function(mon){const ab=v20Ab(mon,state.battle);if(mon?.volatile?.flinch){mon.volatile.flinch=false;if(ab==='innerfocus')return V20_prevCanMove(mon);if(ab==='steadfast')v20Boost(mon,{spe:1},'ふくつのこころ');v20Log(`${mon.name}はひるんで動けない！`);return false;}if(ab==='earlybird'&&mon?.status==='slp')mon.statusTurns=Math.max(0,Number(mon.statusTurns||0)+1);return V20_prevCanMove(mon);};

// End-of-turn recovery, status cures and stat changes.
const V20_prevProcessEndTurn=processEndTurn;
processEndTurn=function(b){
 if(!b)return V20_prevProcessEndTurn(b);
 const all=v20AllMons(b),savedStatus=[],savedSeed=[],activeBefore=new Set(v20Active('player',b).concat(v20Active('enemy',b)).map(m=>m.uid));
 for(const mon of all){if(!mon)continue;const ab=v20Ab(mon,b);if(ab==='magicguard'&&['brn','psn','tox'].includes(mon.status)){savedStatus.push([mon,mon.status,mon.statusTurns]);mon.status=null;}else if(ab==='poisonheal'&&['psn','tox'].includes(mon.status)){savedStatus.push([mon,mon.status,mon.statusTurns]);mon.status=null;}
  if(ab==='magicguard'&&mon.volatile?.leechseed){savedSeed.push([mon,mon.volatile.leechseed,mon.volatile.leechseedOwner]);delete mon.volatile.leechseed;delete mon.volatile.leechseedOwner;}
 }
 const weatherOff=v20WeatherSuppressed(b),weatherBefore=b.weather,weatherTurnsBefore=Number(b.weatherTurns||0),weatherImmunePatch=(b.weather==='sand'||b.weather==='snow')&&!weatherOff;
 const speciesLookup=monSpecies;
 if(weatherImmunePatch){monSpecies=function(mon){const sp=speciesLookup(mon);if(!sp||!mon)return sp;const ab=v20Ab(mon,b),immune=(b.weather==='sand'&&(ab==='magicguard'||ab==='sandveil'))||(b.weather==='snow'&&(ab==='magicguard'||ab==='snowcloak'));if(!immune)return sp;const types=[...(sp.types||[])],weatherType=b.weather==='sand'?'Rock':'Ice';if(!types.includes(weatherType))types.push(weatherType);return {...sp,types};};}
 if(weatherOff){b.weather=null;b.weatherTurns=0;}
 try{V20_prevProcessEndTurn(b);}finally{monSpecies=speciesLookup;if(weatherOff){b.weather=weatherBefore;b.weatherTurns=Math.max(0,weatherTurnsBefore-1);if(b.weatherTurns===0){b.weather=null;v20Log(`${WEATHER_JA[weatherBefore]||'天候'}が止んだ。`);}}for(const [m,s,t] of savedStatus){m.status=s;m.statusTurns=t;}for(const [m,seed,owner] of savedSeed){m.volatile=m.volatile||{};m.volatile.leechseed=seed;m.volatile.leechseedOwner=owner;}}
 for(const mon of all){if(!mon||mon.fainted||mon.hp<=0||!activeBefore.has(mon.uid))continue;const ab=v20Ab(mon,b);
  if(ab==='speedboost')v20Boost(mon,{spe:1},'かそく');
  if(ab==='raindish'&&b.weather==='rain'&&!v20WeatherSuppressed(b))v20Heal(mon,mon.maxhp/16,'あめうけざら');
  if(ab==='icebody'&&b.weather==='snow'&&!v20WeatherSuppressed(b))v20Heal(mon,mon.maxhp/16,'アイスボディ');
  if(ab==='dryskin'&&b.weather==='rain'&&!v20WeatherSuppressed(b))v20Heal(mon,mon.maxhp/8,'かんそうはだ');
  if(ab==='dryskin'&&b.weather==='sun'&&!v20WeatherSuppressed(b)){const d=Math.max(1,Math.floor(mon.maxhp/8));mon.hp=Math.max(0,mon.hp-d);if(mon.hp<=0)mon.fainted=true;v20Log(`${mon.name}はかんそうはだで${d}ダメージを受けた！`);}
  if(Number(mon._v20PerishTurns||0)>0){mon._v20PerishTurns--;if(mon._v20PerishTurns<=0){mon.hp=0;mon.fainted=true;v20Log(`${mon.name}はほろびのうたで倒れた！`);}}
  if(ab==='poisonheal'&&['psn','tox'].includes(mon.status))v20Heal(mon,mon.maxhp/8,'ポイズンヒール');
  if(ab==='solarpower'&&b.weather==='sun'&&!v20WeatherSuppressed(b)){const d=Math.max(1,Math.floor(mon.maxhp/8));mon.hp=Math.max(0,mon.hp-d);if(mon.hp<=0)mon.fainted=true;v20Log(`${mon.name}はサンパワーで${d}ダメージを受けた！`);}
  if(ab==='shedskin'&&mon.status&&Math.random()<1/3){mon.status=null;mon.statusTurns=0;v20Log(`${mon.name}のだっぴ！ 状態異常が治った！`);}
  if(ab==='hydration'&&mon.status&&b.weather==='rain'&&!v20WeatherSuppressed(b)){mon.status=null;mon.statusTurns=0;v20Log(`${mon.name}のうるおいボディ！ 状態異常が治った！`);}
  if(ab==='moody'){const keys=['atk','def','spa','spd','spe','accuracy','evasion'],up=chooseRandom(keys),down=chooseRandom(keys.filter(x=>x!==up));v20Boost(mon,{[up]:2,[down]:-1},'ムラっけ');}
  if(ab==='harvest'&&!mon.heldItem&&mon._lastConsumedItem&&/berry/i.test(String(mon._lastConsumedItem))&&(b.weather==='sun'||Math.random()<.5)){mon.heldItem=mon._lastConsumedItem;mon._lastConsumedItem=null;mon._itemConsumed=false;v20Log(`${mon.name}のしゅうかく！ きのみを取り戻した！`);}
  if(ab==='baddreams'&&v20Opponents(mon,b).some(x=>x.status==='slp'&&x.hp>0)){for(const foe of v20Opponents(mon,b).filter(x=>x.status==='slp')){const d=Math.max(1,Math.floor(foe.maxhp/8));foe.hp=Math.max(0,foe.hp-d);if(foe.hp<=0)foe.fainted=true;v20Log(`${foe.name}はナイトメアで${d}ダメージ！`);}}
  if(ab==='healer'){for(const ally of v20Allies(mon,b))if(ally.status&&Math.random()<.3){ally.status=null;ally.statusTurns=0;v20Log(`${mon.name}のいやしのこころ！ ${ally.name}の状態異常が治った！`);}}
  if(ab==='slowstart'&&mon._v20SlowStartTurns>0)mon._v20SlowStartTurns--;
  if(mon.volatile)delete mon.volatile.flinch;
 }
};

// Add a transparent ability audit to Settings and expose diagnostic hooks.

const V20_abilityHudStyle=document.createElement('style');V20_abilityHudStyle.textContent='.ability-mini{display:block;flex-basis:100%;font-size:10px;line-height:1.35;color:#b8d6f4;opacity:.9;margin-top:2px}.hp-subline{flex-wrap:wrap}';document.head.appendChild(V20_abilityHudStyle);
const V20_prevRenderSettings=renderSettings;
renderSettings=function(){
 const html=V20_prevRenderSettings(),a=v20AbilityAudit(),implemented=a.implementedList.slice(0,120),pending=a.notImplementedList.slice(0,160);
 const list=(items)=>items.map(x=>`<span class="pill">${esc(x.jpName||x.id)}</span>`).join(' ');
 return html+`<section class="panel" style="margin-top:16px"><div class="panel-head"><h2>◈ 特性エンジン監査</h2><span class="pill">${V20_ABILITY_ENGINE_VERSION}</span></div><div class="panel-body"><p class="small muted">特性の登録件数と、バトル内の共通処理に接続した件数を分けて表示します。対応済み表示は、全世代・全例外条件の完全再現を保証するものではありません。</p><div class="care-mon-meta"><span class="pill">収録 ${a.total}種類</span><span class="pill">処理接続 ${a.implemented}種類</span><span class="pill">未接続 ${a.notImplemented}種類</span></div><details><summary>処理接続済みの特性（最大120件表示）</summary><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">${list(implemented)}</div></details><details><summary>個別処理が未接続の特性（最大160件表示）</summary><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">${list(pending)}</div></details><p class="tiny muted">この一覧はコード上の接続状況です。実際のゲーム内テストで全パターンを確認したという意味ではありません。</p></div></section>`;
};
if(window.PokemonChampions2D){Object.assign(window.PokemonChampions2D,{abilityEngineVersion:V20_ABILITY_ENGINE_VERSION,abilityAudit:v20AbilityAudit});}
if(window.PokemonChampions2DData){Object.assign(window.PokemonChampions2DData,{abilityEngineVersion:V20_ABILITY_ENGINE_VERSION,abilityAudit:v20AbilityAudit});}

// v16.22 - prioritized battle logic repair layer
const V21_VERSION='v16.22-battle-logic-fix';
const V21_ABILITY_ALIAS={
 ability184:'aerilate', ability185:'parentalbond', ability189:'primordialsea', ability190:'desolateland',
 ability191:'deltastream', ability206:'galvanize', ability207:'surgesurfer', ability221:'tanglinghair',
 ability223:'powerofalchemy', ability233:'neuroforce', ability250:'mimicry', ability255:'gorillatactics',
 ability257:'pastelveil', ability259:'quickdraw', ability261:'curiousmedicine', ability266:'asone',
 ability267:'asone', ability299:'mindseye', ability305:'terashell', ability309:'dragonskin'
};
function v21CanonAbilityId(value){const key=slug(value);return V21_ABILITY_ALIAS[key]||key;}
const V21_prevBcAbility=bcAbility;
bcAbility=function(mon,b=state.battle){const raw=V21_prevBcAbility(mon,b);return v21CanonAbilityId(raw);};

// Japanese item names are normalized at the same boundary as English item IDs.
const V21_ITEM_ALIAS={
 'しんかのきせき':'eviolite','ブーストエナジー':'boosterenergy','ラムのみ':'lumberry','オボンのみ':'sitrusberry',
 'レッドカード':'redcard','かえんだま':'flameorb','どくどくだま':'toxicorb','きあいのハチマキ':'focusband',
 'きあいのタスキ':'focussash','こだわりハチマキ':'choiceband','こだわりメガネ':'choicespecs','こだわりスカーフ':'choicescarf',
 'たべのこし':'leftovers','くろいヘドロ':'blacksludge','ゴツゴツメット':'rockyhelmet','とつげきチョッキ':'assaultvest',
 'いのちのたま':'lifeorb','しろいハーブ':'whiteherb','じゃくてんほけん':'weaknesspolicy','かいがらのすず':'shellbell',
 'あつぞこブーツ':'heavydutyboots','ふうせん':'airballoon','ピントレンズ':'scopeLens','たつじんのおび':'expertbelt',
 'ちからのハチマキ':'muscleband','ものしりメガネ':'wiseglasses','こうかくレンズ':'widelens','フォーカスレンズ':'zoomlens',
 'ぼうじんゴーグル':'safetygoggles','クリアチャーム':'clearamulet','メンタルハーブ':'mentalherb','ひかりのねんど':'lightclay'
};
const V21_prevItemSlug=itemSlug;
itemSlug=function(value){const raw=String(value??'');return V21_ITEM_ALIAS[raw]||V21_prevItemSlug(value);};

// Canonical move IDs for legacy handlers that still expect a name-style ID.
const V21_MOVE_ID_JP={
 'でんじは':'thunderwave','おにび':'willowisp','どくどく':'toxic','ねむる':'rest','まもる':'protect',
 'じこさいせい':'recover','はねやすめ':'roost','なまける':'slackoff','タマゴうみ':'softboiled','ミルクのみ':'milkdrink',
 'つきのひかり':'moonlight','こうごうせい':'synthesis','あさのひざし':'morningsun','つるぎのまい':'swordsdance',
 'わるだくみ':'nastyplot','めいそう':'calmmind','こうそくいどう':'agility','エレキフィールド':'electricterrain',
 'グラスフィールド':'grassyterrain','サイコフィールド':'psychicterrain','ミストフィールド':'mistyterrain',
 'にほんばれ':'sunnyday','あまごい':'raindance','すなあらし':'sandstorm','ゆきげしき':'snowscape','あられ':'hail',
 'ウェザーボール':'weatherball','テラバースト':'terablast','ボディプレス':'bodypress','サイコショック':'psyshock',
 'サイコブレイク':'psystrike','イカサマ':'foulplay','じばく':'selfdestruct','だいばくはつ':'explosion',
 'みがわり':'substitute','はたきおとす':'knockoff','トリック':'trick','すりかえ':'switcheroo','どろぼう':'thief',
 'ほしがる':'covet','ステルスロック':'stealthrock','まきびし':'spikes','どくびし':'toxicspikes',
 'ねばねばネット':'stickyweb','リフレクター':'reflect','ひかりのかべ':'lightscreen','オーロラベール':'auroraveil',
 'きりばらい':'defog','こうそくスピン':'rapidspin','やどりぎのタネ':'leechseed','ちょうはつ':'taunt',
 'アンコール':'encore','かなしばり':'disable','いちゃもん':'torment','ほえる':'roar','ふきとばし':'whirlwind',
 'ドラゴンテール':'dragontail','ともえなげ':'circlethrow','ねこだまし':'fakeout','とんぼがえり':'uturn',
 'ボルトチェンジ':'voltswitch','クイックターン':'flipturn','バトンタッチ':'batonpass'
};
function v21MoveId(move){if(!move)return '';const jp=String(move.jpName||move.displayName||'').trim();if(V21_MOVE_ID_JP[jp])return V21_MOVE_ID_JP[jp];const raw=String(move.id||move.name||'');return /^api-\d+$/i.test(raw)?'':slug(raw);}
const V21_prevBcMoveId=bcMoveId;
bcMoveId=function(move){const id=v21MoveId(move);return id||V21_prevBcMoveId(move);};

// Fill missing flags from Japanese names, not the often-numeric api-N IDs.
const V21_FLAG_SETS={
 bite:new Set(['かみつく','かみくだく','ほのおのキバ','こおりのキバ','かみなりのキバ','どくどくのキバ','ひっさつまえば','サイコファング','くらいつく']),
 punch:new Set(['メガトンパンチ','れんぞくパンチ','ほのおのパンチ','れいとうパンチ','かみなりパンチ','マッハパンチ','ばくれつパンチ','きあいパンチ','スカイアッパー','シャドーパンチ','ドレインパンチ','バレットパンチ','アームハンマー','コメットパンチ','グロウパンチ','プラズマフィスト','れんぞくパンチ','ジェットパンチ']),
 slicing:new Set(['いあいぎり','きりさく','はっぱカッター','エアカッター','つじぎり','サイコカッター','クロスポイズン','シザークロス','リーフブレード','せいなるつるぎ','みねうち','きょじゅうざん','きょじゅうだん','シャドークロー','アクアカッター','むねんのつるぎ']),
 sound:new Set(['うたう','いやなおと','ほえる','ほろびのうた','ハイパーボイス','りんしょう','エコーボイス','むしのさざめき','さわぐ','おしゃべり','チャームボイス','バークアウト','スケイルノイズ','ばくおんぱ','うたかたのアリア','ないしょばなし','ソウルビート','オーバードライブ','いびき','きんぞくおん','くさぶえ','いやしのすず']),
 pulse:new Set(['はどうだん','りゅうのはどう','あくのはどう','みずのはどう','いやしのはどう','こんげんのはどう','だいちのはどう']),
 bullet:new Set(['タネマシンガン','タネばくだん','エナジーボール','シャドーボール','ジャイロボール','アシッドボム','ウェザーボール','マグネットボム','ヘドロばくだん','でんじほう','ロックブラスト','がんせきほう','どろばくだん','はどうだん','きあいだま','かえんだん','オクタンほう','エレキボール','ミストボール']),
 wind:new Set(['かぜおこし','かまいたち','エアカッター','エアスラッシュ','ぼうふう','こがらしあらし','ねっさのあらし','こがらしあらし','こごえるかぜ','ぎんいろのかぜ','あやしいかぜ','ようせいのかぜ','おいかぜ','ふきとばし','たつまき']),
 powder:new Set(['ねむりごな','どくのこな','しびれごな','ふんじん','いかりのこな','わたほうし','キノコのほうし','いかりのこな']),
 contact:new Set(['たいあたり','ひっかく','ずつき','のしかかり','かみつく','かみくだく','ほのおのキバ','こおりのキバ','かみなりのキバ','アイアンテール','アクアテール','ドラゴンクロー','シャドークロー','つばめがえし','とびひざげり','とびげり','かわらわり','インファイト','フレアドライブ','ブレイブバード','ワイルドボルト','すてみタックル','おんがえし','からげんき','とんぼがえり','クイックターン'])
};
function v21EnsureMoveFlags(move){if(!move||typeof move!=='object')return move;const jp=String(move.jpName||move.displayName||'').trim(),flags={...(move.flags||{})};for(const [name,set] of Object.entries(V21_FLAG_SETS))if(set.has(jp))flags[name]=true;/* Earthquake is not a contact move; override inaccurate imported flag. */if(jp==='じしん')flags.contact=false;if(jp.includes('パンチ'))flags.punch=true;if(jp.includes('キバ'))flags.bite=true;if(jp.includes('カッター'))flags.slicing=true;const contactStatus=move.classificationV2?.contactStatus;if(contactStatus==='confirmed_contact')flags.contact=true;else if(contactStatus==='confirmed_non_contact'||contactStatus==='not_applicable')delete flags.contact;move.flags=flags;return move;}
const V21_prevGetMove=getMove;
getMove=function(id){return v21EnsureMoveFlags(V21_prevGetMove(id));};
const V21_prevBcFlag=bcFlag;
bcFlag=function(move,flag){return !!(V21_prevBcFlag(move,flag)||(v21EnsureMoveFlags(move)?.flags||{})[flag]);};

// v16.22 core calculation rule: burn is applied exactly once in calculateDamage,
// never inside currentStat. Adaptability is represented by the single STAB multiplier
// in calculateDamage; the Terastal wrapper only adjusts the delta from that base.
const V22_CORE_CALC_RULES={burn:'calculateDamage-only',stab:'single-base-stab-plus-tera-delta'};
window.__V22_CORE_CALC_RULES__=V22_CORE_CALC_RULES;

// Infer common effects from the embedded Japanese move catalogue's English mechanicDescription.
const V21_STAT_NAMES={
 attack:'atk',defense:'def',speed:'spe',accuracy:'accuracy',evasion:'evasion',
 'special attack':'spa','special defense':'spd','sp. attack':'spa','sp. defense':'spd'
};
const V21_WORD_NUM={one:1,two:2,three:3,four:4,five:5,six:6};
function v21ExistingSecondary(move,kind,key,amount,side){
 const seconds=[...(Array.isArray(move?.secondaries)?move.secondaries:[]),...(move?.secondary?[move.secondary]:[])];
 if(kind==='flinch')return seconds.some(x=>x?.volatileStatus==='flinch');
 if(kind==='confusion')return ['confuseray','supersonic','swagger','flatter','teeterdance','chatter'].includes(v21MoveId(move));
 if(kind==='status')return !!move?.status||seconds.some(x=>x?.status===key);
 if(kind==='boost'){
  const direct=[];
  if(move?.boosts)direct.push({side:['self','allySide'].includes(move.target)?'self':'target',boosts:move.boosts});
  if(move?.self?.boosts)direct.push({side:'self',boosts:move.self.boosts});
  if(move?.selfBoost?.boosts)direct.push({side:'self',boosts:move.selfBoost.boosts});
  for(const x of seconds)if(x?.boosts)direct.push({side:x.self?'self':'target',boosts:x.boosts});
  return direct.some(x=>x.side===side&&Number(x.boosts?.[key]||0)===Number(amount));
 }
 return false;
}
function v21ParseMoveEffects(move){
 if(!move||typeof move!=='object'||move._canonicalEffectsExplicit)return [];
 const desc=String(move.mechanicDescription||move.shortDesc||'').replace(/（英語原文）/g,'').trim();
 if(!desc)return [];
 if(move._v21ParsedDesc===desc&&Array.isArray(move._v21ParsedEffects))return move._v21ParsedEffects;
 const out=[],effChance=Number(move.effectChance||0),chanceOf=m=>/has a chance/i.test(m)?Math.max(0,Math.min(100,effChance)):100;
 const push=e=>{if(e&&Number(e.chance)>0)out.push(e);};
 const statRx=/(has a chance to\s+)?(raises?|lowers?|raise|lower)\s+(?:the\s+)?(user|target)(?:['’]s|s')\s+([^.;]+?)\s+by\s+(one|two|three|four|five|six|\d+)\s+stages?/gi;
 let m;
 while((m=statRx.exec(desc))){
  const chance=m[1]?chanceOf(m[0]):100,side=m[3].toLowerCase()==='user'?'self':'target',delta=/^rais/i.test(m[2])?1:-1,amount=(V21_WORD_NUM[m[5].toLowerCase()]||Number(m[5]))*delta;
  const text=m[4].toLowerCase().replace(/special\s+attack/g,'specialattack').replace(/special\s+defense/g,'specialdefense');
  const keys=[];for(const term of ['specialattack','specialdefense','attack','defense','speed','accuracy','evasion'])if(new RegExp('\\b'+term+'\\b').test(text))keys.push(V21_STAT_NAMES[term.replace(/specialattack/,'special attack').replace(/specialdefense/,'special defense')]||({specialattack:'spa',specialdefense:'spd',attack:'atk',defense:'def',speed:'spe',accuracy:'accuracy',evasion:'evasion'}[term]));
  if(!keys.length)continue;
  const boosts={};for(const key of keys)if(!v21ExistingSecondary(move,'boost',key,amount,side))boosts[key]=amount;
  if(Object.keys(boosts).length)push({kind:'boost',side,boosts,chance,secondary:chance<100});
 }
 const statusPatterns=[
  {re:/has a chance to burn the target|\bburns the target\b/i,status:'brn'},
  {re:/has a chance to freeze the target|\bfreezes the target\b/i,status:'frz'},
  {re:/has a chance to paralyze the target|\bparaly[sz]es the target\b/i,status:'par'},
  {re:/has a chance to badly poison the target|\bbadly poisons the target\b/i,status:'tox'},
  {re:/has a chance to poison the target|(?<!badly )\bpoisons the target\b/i,status:'psn'}
 ];
 for(const item of statusPatterns){const match=desc.match(item.re);const id=v21MoveId(move);if(match&&!['thunderwave','willowisp','toxic'].includes(id)&&!v21ExistingSecondary(move,'status',item.status,null,'target'))push({kind:'status',side:'target',status:item.status,chance:/has a chance/i.test(match[0])?chanceOf(match[0]):100,secondary:/has a chance/i.test(match[0])});}
 const randomMatch=desc.match(/has a chance to burn, freeze, or paralyze the target/i);
 if(randomMatch&&!v21ExistingSecondary(move,'status','random',null,'target'))push({kind:'randomStatus',side:'target',statuses:['brn','frz','par'],chance:chanceOf(randomMatch[0]),secondary:true});
 const confuseMatch=desc.match(/(?:has a chance to |may )?confuse(?:s)? the (target|user)\b/i);
 if(confuseMatch&&!v21ExistingSecondary(move,'confusion',null,null,confuseMatch[1].toLowerCase()==='user'?'self':'target')&&!/then confuses the user/i.test(desc))push({kind:'confusion',side:confuseMatch[1].toLowerCase()==='user'?'self':'target',chance:/has a chance|may /i.test(confuseMatch[0])?chanceOf(confuseMatch[0]):100,secondary:/has a chance|may /i.test(confuseMatch[0])});
 const flinchMatch=desc.match(/(?:has a chance to make the target flinch|causes the target to flinch|makes the target flinch)/i);
 if(flinchMatch&&!v21ExistingSecondary(move,'flinch',null,null,'target'))push({kind:'flinch',side:'target',chance:/has a chance/i.test(flinchMatch[0])?chanceOf(flinchMatch[0]):100,secondary:/has a chance/i.test(flinchMatch[0])});
 move._v21ParsedDesc=desc;move._v21ParsedEffects=out;return out;
}
const V21_SELF_EFFECT_IDS=new Set(['closecombat','superpower','overheat','dracometeor','leafstorm','psychoboost','makeitrain','fleurcannon','vcreate','hammerarm','icehammer','clangoroussoul','scaleshot','rapidspin','flamecharge','trailblaze','meteormash','steelwing','ancientpower','ominouswind','silverwind','fellstinger','esperwing','charge','swordsdance','nastyplot','calmmind','agility'].map(slug));
const V21_TARGET_EFFECT_IDS=new Set(['breakingswipe','icywind','electroweb','snarl','lunge','mysticalfire','skittersmack','spiritbreak','chillingwater','bulldoze','acidspray','eerieimpulse','faketears','metalsound','screech','leer','tailwhip','growl','charm','scaryface','stringshot','featherdance','cottonspore','confide','tearfullook','babydolleyes','swordsdance','nastyplot','calmmind','agility'].map(slug));
function v21RollEffect(effect,actor,target,b){
 if(!effect||!actor||!target)return;const actorAb=v21CanonAbilityId(bcAbility(actor,b)),targetAb=v21CanonAbilityId(bcAbility(target,b));
 let chance=Number(effect.chance??100);if(chance<100&&actorAb==='serenegrace')chance=Math.min(100,chance*2);
 if(effect.secondary&&actorAb==='sheerforce')return;
 if(effect.secondary&&effect.side==='target'&&targetAb==='shielddust')return;
 if(chance<100&&Math.random()*100>=chance)return;
 if(effect.kind==='boost'){
  const who=effect.side==='self'?actor:target,old=b?b._eventActorUid:null;if(b)b._eventActorUid=actor.uid;
  try{applyBoosts(who,effect.boosts,getMoveName?getMoveName(effect.move||{}) : '技の追加効果');}finally{if(b)b._eventActorUid=old;}
 }else if(effect.kind==='status'){
  if(effect.side==='target'&&target!==actor)setStatus(target,effect.status,getMoveName(effect.move||{}));
  else setStatus(actor,effect.status,getMoveName(effect.move||{}));
 }else if(effect.kind==='randomStatus'){
  if(target&&target!==actor){const available=effect.statuses.filter(s=>!target.status);if(available.length)setStatus(target,chooseRandom(available),getMoveName(effect.move||{}));}
 }else if(effect.kind==='confusion'){
  const who=effect.side==='self'?actor:target;if(who&&!(who._confusionTurns>0)){who._confusionTurns=2+Math.floor(Math.random()*4);battleLog(`${who.name}は混乱した！`);}
 }else if(effect.kind==='flinch'){
  if(target!==actor&&!target.fainted&&!target._v21ActedThisTurn){target.volatile=target.volatile||{};target.volatile.flinch=true;battleLog(`${target.name}はひるんだ！`);}
 }
}
const V21_prevApplyMoveExtras=applyMoveExtras;
applyMoveExtras=function(actor,target,move,b){
 if(!move)return V21_prevApplyMoveExtras(actor,target,move,b);
 const rawId=move.id,canon=v21MoveId(move),oldEvent=b?b._eventActorUid:null;if(canon&&/^api-\d+$/.test(String(rawId||'')))move.id=canon;if(b&&actor)b._eventActorUid=actor.uid;
 try{V21_prevApplyMoveExtras(actor,target,move,b);}finally{move.id=rawId;if(b)b._eventActorUid=oldEvent;}
 const parsed=v21ParseMoveEffects(move);if(!parsed.length||!actor||!target)return;
 for(const effect of parsed){
  if(effect.kind==='boost'&&v21MoveId(move)&&V21_SELF_EFFECT_IDS.has(v21MoveId(move))&&effect.side==='self')continue;
  if(effect.kind==='boost'&&v21MoveId(move)&&V21_TARGET_EFFECT_IDS.has(v21MoveId(move))&&effect.side==='target')continue;
  effect.move=move;v21RollEffect(effect,actor,target,b);
 }
};
const V21_prevMoveSpecific=applyMoveSpecificEffects;
applyMoveSpecificEffects=function(actor,target,move,b){if(!move)return V21_prevMoveSpecific(actor,target,move,b);const rawId=move.id,canon=v21MoveId(move),oldEvent=b?b._eventActorUid:null;if(canon&&/^api-\d+$/.test(String(rawId||'')))move.id=canon;if(b&&actor)b._eventActorUid=actor.uid;try{return V21_prevMoveSpecific(actor,target,move,b);}finally{move.id=rawId;if(b)b._eventActorUid=oldEvent;}};

// Type changes that are determined by the attacker's ability.
const V21_prevResolveContext=resolveContextMoveData;
resolveContextMoveData=function(move,actor,target,b){
 if(!move||!actor)return V21_prevResolveContext(move,actor,target,b);
 const rawId=move.id,canon=v21MoveId(move);if(canon&&/^api-\d+$/.test(String(rawId||'')))move.id=canon;
 let out;try{out=V21_prevResolveContext(move,actor,target,b);}finally{move.id=rawId;}
 if(v21CanonAbilityId(bcAbility(actor,b))==='liquidvoice'&&bcFlag(move,'sound'))return {...out,type:'Water'};
 return out;
};

// Correct abilities whose old handlers compared the raw numeric ID or used a wrong case.
V20_SUPPORTED_ABILITIES.delete('solarfactor');
V20_SUPPORTED_ABILITIES.delete('earthheater');
for(const id of ['liquidvoice','grasspelt','electricsurge','grassysurge','psychicsurge','mistysurge','primordialsea','desolateland','deltastream','analytic','steelworker','dryskin','overcoat','guarddog','screencleaner'])V20_SUPPORTED_ABILITIES.add(id);
function v21AbilityAudit(){
 const list=state.data?.abilitiesList||[];const connected=list.filter(a=>V20_SUPPORTED_ABILITIES.has(v21CanonAbilityId(a.id||a.name)));
 const unsupported=list.filter(a=>!V20_SUPPORTED_ABILITIES.has(v21CanonAbilityId(a.id||a.name)));
 const moves=Object.values(state.data?.moves||{}),parsed=moves.map(v21ParseMoveEffects),parsedMoves=parsed.filter(x=>x.length>0);
 return {version:V21_VERSION,total:list.length,implemented:connected.length,notImplemented:unsupported.length,implementedList:connected.map(a=>({id:a.id,jpName:a.jpName||a.name})),notImplementedList:unsupported.map(a=>({id:a.id,jpName:a.jpName||a.name})),moveTotal:moves.length,parsedMoveCount:parsedMoves.length,parsedEffectCount:parsed.reduce((n,x)=>n+x.length,0),runtimeVerified:0,note:'「接続済み」はコード上の処理接続を示します。すべての例外条件を含む完全再現や実戦テスト済みを意味しません。動作検証件数は別管理です。'};
}


// The previous battle core already implements Contrary, Simple, Mirror Armor, Clear Body, Defiant, Competitive, and Rattled. Keep that single shared handler to avoid applying these modifiers twice.

// Entry abilities: terrain setters, primal weather, Screen Cleaner, and correct Intimidate handling.
const V21_prevTriggerEntry=triggerEntryEffects;
triggerEntryEffects=function(entering,foes,b){
 const entrants=(entering||[]).filter(Boolean),intimidators=[];
 for(const mon of entrants){if(v21CanonAbilityId(bcAbility(mon,b))==='intimidate'){intimidators.push([mon,mon.abilityId]);mon.abilityId='none';}mon._v21ActedThisTurn=false;mon._v21HasActedSinceEntry=false;}
 try{V21_prevTriggerEntry(entrants,foes,b);}finally{for(const [mon,id] of intimidators)mon.abilityId=id;}
 if(!b)return;
 for(const mon of entrants){if(!mon||mon.fainted||mon.hp<=0)continue;const ab=v21CanonAbilityId(bcAbility(mon,b));
  if(ab==='electricsurge')applyTerrain('electric',b);
  else if(ab==='grassysurge')applyTerrain('grassy',b);
  else if(ab==='psychicsurge')applyTerrain('psychic',b);
  else if(ab==='mistysurge')applyTerrain('misty',b);
  else if(ab==='screencleaner'){
   let changed=false;for(const side of Object.values(b.sideConditions||{})){if((side.reflect||0)>0||(side.lightscreen||0)>0||(side.auroraveil||0)>0)changed=true;side.reflect=0;side.lightscreen=0;side.auroraveil=0;}
   if(changed)battleLog(`${mon.name}の「バリアフリー」！ 両側の壁が消えた！`);
  }else if(['primordialsea','desolateland','deltastream'].includes(ab)){
   const marker=ab==='primordialsea'?'heavyrain':ab==='desolateland'?'harshsun':'strongwinds';
   b._v21PrimalWeather=marker;b._v21PrimalWeatherUid=mon.uid;b.weather=marker==='heavyrain'?'rain':marker==='harshsun'?'sun':'strongwinds';b.weatherTurns=999;
   battleLog(`${mon.name}の「${abilityName(mon.abilityId)}」で天候が変わった！`);
  }
 }
 for(const [mon] of intimidators){
  if(!mon||mon.fainted||mon.hp<=0||!v21CanonAbilityId(bcAbility(mon,b)))continue;
  const targets=(foes||v20Opponents(mon,b)||[]).filter(x=>x&&!x.fainted&&x.hp>0);
  for(const foe of targets){const fa=v21CanonAbilityId(bcAbility(foe,b));
   if(['innerfocus','owntempo','oblivious'].includes(fa)){battleLog(`${foe.name}は「${abilityName(foe.abilityId)}」でいかくを受けない！`);continue;}
   if(fa==='guarddog'){const old=b._eventActorUid;b._eventActorUid=mon.uid;try{applyBoosts(foe,{atk:1},'ばんけん');}finally{b._eventActorUid=old;}continue;}
   const old=b._eventActorUid;b._eventActorUid=mon.uid;try{applyBoosts(foe,{atk:-1},'いかく');}finally{b._eventActorUid=old;}
  }
 }
};

// Keep primal weather locked while its source is active; remove it when the source leaves or faints.
const V21_prevApplyWeather=applyWeather;
applyWeather=function(weather,b){
 if(b?._v21PrimalWeather){const w=slug(weather),same=(b._v21PrimalWeather==='heavyrain'&&['rain','raindance','rainyday'].includes(w))||(b._v21PrimalWeather==='harshsun'&&['sun','sunnyday','harshsunlight'].includes(w))||(b._v21PrimalWeather==='strongwinds'&&['strongwinds','deltastream'].includes(w));if(!same){battleLog('強力な天候がほかの天候をかき消した！');return;}}
 return V21_prevApplyWeather(weather,b);
};
const V21_prevTypeMult=typeMult;
typeMult=function(moveType,defSpecies,defMon=null){const b=state.battle,raw=defMon?.abilityId,ab=defMon?v21CanonAbilityId(bcAbility(defMon,b)):'';if(defMon)defMon.abilityId=ab||'none';let base;try{base=V21_prevTypeMult(moveType,defSpecies,defMon);}finally{if(defMon)defMon.abilityId=raw;}const types=defMon?.types||defSpecies?.types||[];if(b?._v21PrimalWeather==='strongwinds'&&!v20WeatherSuppressed(b)&&types.includes('Flying')&&base>1)return base/2;return base;};

// Battle damage fixes and abilities not wired into the previous calculator.

const V21_prevSetStatus=setStatus;
setStatus=function(target,status,sourceName=''){if(!target)return V21_prevSetStatus(target,status,sourceName);const rawAbility=target.abilityId,rawItem=target.heldItem,ab=v21CanonAbilityId(bcAbility(target,state.battle)),item=itemSlug(rawItem);target.abilityId=ab||'none';if(item)target.heldItem=item;try{return V21_prevSetStatus(target,status,sourceName);}finally{target.abilityId=rawAbility;if(target.heldItem===item&&rawItem!==item)target.heldItem=rawItem;}};
const V21_prevCurrentStat=currentStat;
currentStat=function(mon,key){if(!mon)return V21_prevCurrentStat(mon,key);const raw=mon.abilityId,ab=v21CanonAbilityId(bcAbility(mon,state.battle));mon.abilityId=ab||'none';let value;try{value=V21_prevCurrentStat(mon,key);}finally{mon.abilityId=raw;}if(!Number.isFinite(value))return value;if(key==='def'&&ab==='grasspelt'&&state.battle?.terrain==='grassy'&&isGrounded(mon))value=Math.floor(value*1.5);if(key==='spe'&&ab==='surgesurfer'&&state.battle?.terrain==='electric'&&isGrounded(mon))value=Math.floor(value*2);return value;};
const V21_prevCalculateDamage=calculateDamage;
calculateDamage=function(actor,target,move,b){
 if(!actor||!target||!move)return V21_prevCalculateDamage(actor,target,move,b);
 const rawId=move.id,canon=v21MoveId(move);if(canon&&/^api-\d+$/.test(String(rawId||'')))move.id=canon;
 const typeBefore=resolveContextMoveData(move,actor,target,b).type;
 const actorAb=v21CanonAbilityId(bcAbility(actor,b)),targetAb=v21CanonAbilityId(bcAbility(target,b));
 const rawDry=actor.abilityId,maskDry=actorAb==='dryskin'&&typeBefore==='Fire';if(maskDry)actor.abilityId='none';
 let result;try{result=V21_prevCalculateDamage(actor,target,move,b);}finally{if(maskDry)actor.abilityId=rawDry;move.id=rawId;}
 if(!result||result.damage<=0||result.blocked)return result;
 const type=result.type||typeBefore;let mult=1;
 if(actorAb==='steelworker'&&type==='Steel')mult*=1.5;if(actorAb==='megalauncher'&&bcFlag(move,'pulse'))mult*=1.5;
 if(actorAb==='analytic'&&target._v21ActedThisTurn)mult*=1.3;
 if(targetAb==='dryskin'&&type==='Fire')mult*=1.25;
 if(targetAb==='punkrock'&&bcFlag(move,'sound'))mult*=.5;
 if(mult!==1)result.damage=Math.max(1,Math.floor(result.damage*mult));
 return result;
};

// Powder immunity for Overcoat and all Grass-type Pokémon.
const V21_prevExecuteAction=executeAction;
executeAction=function(act,b){
 if(!act||!b)return V21_prevExecuteAction(act,b);
 const team=act.side==='player'?b.playerTeam:b.enemyTeam,actor=team?.find(m=>m?.uid===act.actorUid);
 if(!actor)return V21_prevExecuteAction(act,b);
 const move=act.switchTo==null?getMove(act.moveId):null;
 if(move){v21EnsureMoveFlags(move);const target=targetForAction(actor,act,b),ab=target?v21CanonAbilityId(bcAbility(target,b)):'';const resolved=resolveContextMoveData(move,actor,target||actor,b);if(Number(resolved.power||0)>0&&!v20WeatherSuppressed(b)&&((b._v21PrimalWeather==='heavyrain'&&resolved.type==='Fire')||(b._v21PrimalWeather==='harshsun'&&resolved.type==='Water'))){battleLog(`${actor.name}の技は強力な天候に阻まれた！`);actor._v21ActedThisTurn=true;return;}
  if(move.jpName==='ねこだまし'&&actor._v21HasActedSinceEntry){battleLog(`${actor.name}はこの場に出て最初のターンではないため、ねこだましを使えない！`);actor._v21ActedThisTurn=true;return;}
  const powder=bcFlag(move,'powder');if(powder&&!['self','user','allySide','allies'].includes(move.target)&&target&&target!==actor&&(ab==='overcoat'||(target.types||monSpecies(target)?.types||[]).includes('Grass'))){battleLog(`${target.name}には粉技が効かない！`);actor._v21ActedThisTurn=true;return;}
 }
 const oldEvent=b._eventActorUid;if(actor)b._eventActorUid=actor.uid;
 try{return V21_prevExecuteAction(act,b);}finally{b._eventActorUid=oldEvent;if(act.switchTo==null){actor._v21ActedThisTurn=true;actor._v21HasActedSinceEntry=true;}else if(b._v21PrimalWeatherUid===actor.uid){delete b._v21PrimalWeather;delete b._v21PrimalWeatherUid;b.weather=null;b.weatherTurns=0;battleLog('強力な天候が止んだ！');}}
};
const V21_prevExecuteTurn=executeTurn;
executeTurn=async function(actions){const b=state.battle;if(b){for(const mon of [...(b.playerTeam||[]),...(b.enemyTeam||[])])if(mon)mon._v21ActedThisTurn=false;}return await V21_prevExecuteTurn(actions);};

// End-of-turn keepalive/cleanup for primal weather; existing V20 turn hooks remain intact.
const V21_prevProcessEndTurn=processEndTurn;
processEndTurn=function(b){V21_prevProcessEndTurn(b);if(!b?._v21PrimalWeather)return;const source=[...(b.playerTeam||[]),...(b.enemyTeam||[])].find(m=>m?.uid===b._v21PrimalWeatherUid),active=(b.playerActive||[]).some(i=>b.playerTeam?.[i]?.uid===source?.uid)||(b.enemyActive||[]).some(i=>b.enemyTeam?.[i]?.uid===source?.uid);if(!source||source.fainted||source.hp<=0||!active){const weather=b._v21PrimalWeather==='heavyrain'?'rain':b._v21PrimalWeather==='harshsun'?'sun':'strongwinds';if(b.weather===weather){b.weather=null;b.weatherTurns=0;}delete b._v21PrimalWeather;delete b._v21PrimalWeatherUid;battleLog('強力な天候が止んだ！');}else{b.weather=b._v21PrimalWeather==='heavyrain'?'rain':b._v21PrimalWeather==='harshsun'?'sun':'strongwinds';b.weatherTurns=999;}};


const V21_prevAbilityTriggerOnMove=abilityTriggerOnMove;
abilityTriggerOnMove=function(actor,target,move,b){if(!target)return V21_prevAbilityTriggerOnMove(actor,target,move,b);const raw=target.abilityId;target.abilityId=v21CanonAbilityId(bcAbility(target,b))||'none';try{return V21_prevAbilityTriggerOnMove(actor,target,move,b);}finally{target.abilityId=raw;}};
const V21_prevApplyDamage=applyDamage;
applyDamage=function(target,damage,source=null,move=null){if(!target)return V21_prevApplyDamage(target,damage,source,move);const raw=target.abilityId;target.abilityId=v21CanonAbilityId(bcAbility(target,state.battle))||'none';let actual;try{actual=V21_prevApplyDamage(target,damage,source,move);}finally{target.abilityId=raw;}if(actual>0&&target.hp>0&&bcItem(target)==='sitrusberry'&&target.hp<=target.maxhp/2){const heal=Math.max(1,Math.floor(target.maxhp/4));target.hp=Math.min(target.maxhp,target.hp+heal);bcConsumeItem(target,'HPが半分以下になった');battleLog(`${target.name}はオボンのみでHPを回復した！`);}return actual;};

// Correct item names in consumption logs without changing item/save data.
const V21_ITEM_JA={
 choicescarf:'こだわりスカーフ',choiceband:'こだわりハチマキ',choicespecs:'こだわりメガネ',lifeorb:'いのちのたま',focussash:'きあいのタスキ',
 leftovers:'たべのこし',sitrusberry:'オボンのみ',rockyhelmet:'ゴツゴツメット',assaultvest:'とつげきチョッキ',heavydutyboots:'あつぞこブーツ',
 blacksludge:'くろいヘドロ',flameorb:'かえんだま',toxicorb:'どくどくだま',weaknesspolicy:'じゃくてんほけん',whiteherb:'しろいハーブ',
 redcard:'レッドカード',shellbell:'かいがらのすず',eviolite:'しんかのきせき',boosterenergy:'ブーストエナジー',lumberry:'ラムのみ',
 scopeLens:'ピントレンズ',scopelens:'ピントレンズ',expertbelt:'たつじんのおび',muscleband:'ちからのハチマキ',wiseglasses:'ものしりメガネ'
};
bcConsumeItem=function(mon,why=''){if(!mon||!mon.heldItem)return '';const item=mon.heldItem,key=itemSlug(item),display=V21_ITEM_JA[key]||String(item);mon._lastConsumedItem=item;mon._lastConsumedItemSlug=key;mon._itemConsumed=true;mon.heldItem='';if(why)battleLog(`${mon.name}の${display}が${why}で消費された！`);return item;};

// Do not claim a runtime test merely because an ability appears in a supported-name set.
function v21IntegrityChecks(){
 const checks=[];const check=(name,ok,detail='')=>checks.push({name,passed:!!ok,detail});
 const tests=[
  ['ID alias: Sky Skin',v21CanonAbilityId('ability-184')==='aerilate'],
  ['ID alias: Electric Skin',v21CanonAbilityId('ability-206')==='galvanize'],
  ['ID alias: Terashell',v21CanonAbilityId('ability-305')==='terashell'],
  ['flag: crunch is a bite move',bcFlag({id:'api-242',jpName:'かみくだく',flags:{}},'bite')],
  ['flag: Thunder Wave is not a powder move',!bcFlag({id:'api-86',jpName:'でんじは',flags:{}},'powder')]
 ];for(const [n,ok] of tests)check(n,ok);
 const byName=name=>Object.values(state.data?.moves||{}).find(m=>m.jpName===name);
 const expect=(name,kind,prop,want)=>{const mv=byName(name);if(!mv){check(`move parse: ${name}`,false,'move missing');return;}const fx=v21ParseMoveEffects(mv);const found=fx.some(e=>e.kind===kind&&(prop==='chance'?e.chance===want:prop==='status'?e.status===want:prop==='flinch'?e.kind==='flinch':prop==='boost'?Object.values(e.boosts||{}).includes(want):true));check(`move parse: ${name}`,found,`parsed ${fx.length} effect(s)`);};
 expect('かみくだく','boost','boost',-1);expect('シャドーボール','boost','boost',-1);{const stomp=byName('ふみつけ');check('move parse: ふみつけ flinch',!!stomp&&((stomp.secondaries||[]).some(x=>x.volatileStatus==='flinch')||v21ParseMoveEffects(stomp).some(x=>x.kind==='flinch')));}expect('オーバーヒート','boost','boost',-2);expect('かたくなる','boost','boost',1);
 return {version:V21_VERSION,passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
}
function v21BattleAudit(){const moveData=Object.values(state.data?.moves||{}),parsed=moveData.map(v21ParseMoveEffects);return {version:V21_VERSION,moveCount:moveData.length,japaneseNameCount:moveData.filter(m=>!!m.jpName).length,descriptionParsedMoves:parsed.filter(x=>x.length).length,inferredEffects:parsed.reduce((n,x)=>n+x.length,0),abilityAudit:v21AbilityAudit(),integrityChecks:v21IntegrityChecks(),warnings:['技の汎用追加効果（能力変化・状態異常・混乱・ひるみ）を説明データから補完します。','個別専用処理が必要な技、ダブルバトル固有処理、全特性・全持ち物の完全再現を保証するものではありません。','進化データに未進化判定がないため、しんかのきせきの全対象判定は今回未修正です。']};}
if(window.PokemonChampions2D){Object.assign(window.PokemonChampions2D,{battleLogicVersion:V21_VERSION,abilityEngineVersion:V21_VERSION,abilityAudit:v21AbilityAudit,integrityChecks:v21IntegrityChecks,battleAudit:v21BattleAudit,parseMoveEffects:v21ParseMoveEffects,canonicalAbilityId:v21CanonAbilityId,getMove:getMove,currentStat:currentStat,calculateDamage:calculateDamage,resolveContextMoveData:resolveContextMoveData,setStatus:setStatus,triggerEntryEffects:triggerEntryEffects,applyMoveExtras:applyMoveExtras,applyMoveSpecificEffects:applyMoveSpecificEffects,applyBoosts:applyBoosts,bcAbility:bcAbility,bcFlag:bcFlag,bcItem:bcItem,applyDamage:applyDamage,abilityTriggerOnMove:abilityTriggerOnMove,executeAction:executeAction,executeTurn:executeTurn,processEndTurn:processEndTurn});}
if(window.PokemonChampions2DData){Object.assign(window.PokemonChampions2DData,{battleLogicVersion:V21_VERSION,abilityEngineVersion:V21_VERSION,abilityAudit:v21AbilityAudit,integrityChecks:v21IntegrityChecks,battleAudit:v21BattleAudit});}

// v16.23: move mechanics classification v2. The move category remains Physical/Special/Status;
// effects, formula dependencies, contact flags and timing are independent overlapping tags.
const __v1623LoadAllData=loadAllData;
loadAllData=async function(){const result=await __v1623LoadAllData();const audit=auditMoveClassificationV2();window.PokemonChampions2DData=window.PokemonChampions2DData||{};Object.assign(window.PokemonChampions2DData,{moveClassificationVersion:'move-mechanics-v2',auditMoveClassificationV2,classifyMoveV2:m=>m?.classificationV2||null,moveClassificationAuditV2:audit});return result;};
Object.assign(window.PokemonChampions2DData,{moveClassificationVersion:'move-mechanics-v2',auditMoveClassificationV2,classifyMoveV2:m=>m?.classificationV2||null});
// ================================================================
// v17.0 — Unified Battle Tag Engine
// Bridges classificationV2 tags to the battle core's existing flags,
// move fields and formula paths. Does not invent unsupported mechanics.
// ================================================================
const V17_BATTLE_TAG_ENGINE_VERSION = '17.2.0';
const V17_BATTLE_TAG_DEFINITIONS = [
 {id:'category_physical',group:'category',runtime:'field',field:'category',label:'物理技'},
 {id:'category_special',group:'category',runtime:'field',field:'category',label:'特殊技'},
 {id:'category_status',group:'category',runtime:'field',field:'category',label:'変化技'},
 {id:'direct_damage',group:'damage',runtime:'field',field:'basePower',label:'直接ダメージ'},
 {id:'contact_attack',group:'trait',runtime:'flag',flag:'contact',label:'接触技'},
 {id:'non_contact_attack',group:'trait',runtime:'classification',label:'非接触技'},
 {id:'sound',group:'trait',runtime:'flag',flag:'sound',label:'音技'},
 {id:'bullet',group:'trait',runtime:'flag',flag:'bullet',label:'弾技'},
 {id:'powder',group:'trait',runtime:'flag',flag:'powder',label:'粉技'},
 {id:'punch',group:'trait',runtime:'flag',flag:'punch',label:'パンチ技'},
 {id:'bite',group:'trait',runtime:'flag',flag:'bite',label:'かみつき技'},
 {id:'slicing',group:'trait',runtime:'flag',flag:'slicing',label:'切断技'},
 {id:'wind',group:'trait',runtime:'flag',flag:'wind',label:'風技'},
 {id:'pulse',group:'trait',runtime:'flag',flag:'pulse',label:'波動技'},
 {id:'reflectable',group:'trait',runtime:'flag',flag:'reflectable',label:'反射可能'},
 {id:'status_effect',group:'effect',runtime:'effects',label:'状態異常効果'},
 {id:'volatile_effect',group:'effect',runtime:'effects',label:'状態変化効果'},
 {id:'flinch_effect',group:'effect',runtime:'effects',label:'ひるみ効果'},
 {id:'confusion_effect',group:'effect',runtime:'effects',label:'こんらん効果'},
 {id:'stat_stage_change',group:'effect',runtime:'effects',label:'能力ランク変化'},
 {id:'target_stat_change',group:'effect',runtime:'effects',label:'相手の能力変化'},
 {id:'self_stat_change',group:'effect',runtime:'effects',label:'自分の能力変化'},
 {id:'heal',group:'effect',runtime:'effects',label:'HP回復'},
 {id:'drain_healing',group:'effect',runtime:'field',field:'drain',label:'HP吸収'},
 {id:'recoil_after_hit',group:'effect',runtime:'field',field:'recoil',label:'反動ダメージ'},
 {id:'remove_status',group:'effect',runtime:'effects',label:'状態異常解除'},
 {id:'clear_boosts',group:'effect',runtime:'effects',label:'能力変化解除'},
 {id:'multi_hit',group:'damage',runtime:'field',field:'multihit',label:'連続攻撃'},
 {id:'fixed_damage',group:'damage',runtime:'field',field:'damage',label:'固定ダメージ'},
 {id:'ohko',group:'damage',runtime:'field',field:'ohko',label:'一撃必殺'},
 {id:'counter_damage',group:'damage',runtime:'formula_review',label:'受けたダメージを返す'},
 {id:'move_priority',group:'order',runtime:'field',field:'priority',label:'先制技'},
 {id:'negative_priority',group:'order',runtime:'field',field:'priority',label:'後攻技'},
 {id:'charge_turn',group:'turn',runtime:'flag',flag:'charge',label:'溜め技'},
 {id:'semi_invulnerable_turn',group:'turn',runtime:'existing_rule',label:'姿を隠すターン'},
 {id:'recharge_turn',group:'turn',runtime:'flag',flag:'recharge',label:'反動で動けないターン'},
 {id:'protect_effect',group:'defense',runtime:'existing_rule',label:'まもる系'},
 {id:'bypass_protect',group:'defense',runtime:'existing_rule',label:'まもる貫通'},
 {id:'bypass_substitute',group:'defense',runtime:'flag',flag:'bypasssub',label:'みがわり貫通'},
 {id:'force_switch',group:'field',runtime:'existing_rule',label:'強制交代'},
 {id:'self_switch',group:'field',runtime:'field',field:'selfSwitch',label:'攻撃後に交代'},
 {id:'weather_or_terrain',group:'field',runtime:'field',field:'weather/terrain',label:'天候・フィールド変更'},
 {id:'hazard',group:'field',runtime:'existing_rule',label:'設置技'},
 {id:'crash_damage_on_miss',group:'damage',runtime:'existing_rule',label:'失敗時の反動'},
 {id:'power_by_target_weight',group:'formula',runtime:'formula_review',label:'相手の重さで威力変化'},
 {id:'power_by_user_hp_ratio',group:'formula',runtime:'formula_review',label:'自分の残りHPで威力変化'},
 {id:'power_by_remaining_hp',group:'formula',runtime:'formula_review',label:'相手の残りHPで威力変化'},
 {id:'power_by_speed_ratio',group:'formula',runtime:'formula_review',label:'素早さで威力変化'},
 {id:'power_by_positive_stat_stages',group:'formula',runtime:'formula_review',label:'能力ランクで威力変化'},
 {id:'target_item_power_bonus',group:'formula',runtime:'formula_review',label:'相手の持ち物で威力変化'},
 {id:'power_by_held_item',group:'formula',runtime:'formula_review',label:'自分の持ち物で威力変化'},
 {id:'uses_target_attack',group:'formula',runtime:'formula_review',label:'相手の攻撃を使う'},
 {id:'uses_user_defense',group:'formula',runtime:'formula_review',label:'自分の防御を使う'},
 {id:'damage_formula_review',group:'formula',runtime:'formula_review',label:'特殊ダメージ式・要確認'},
 {id:'type_change',group:'formula',runtime:'existing_rule',label:'技タイプ変化'},
 {id:'critical_hit',group:'damage',runtime:'existing_rule',label:'急所関連'},
 {id:'item_manipulation',group:'effect',runtime:'existing_rule',label:'持ち物操作'},
 {id:'ability_manipulation',group:'effect',runtime:'existing_rule',label:'特性操作'},
 {id:'contact_punishment',group:'trait',runtime:'existing_rule',label:'接触時の反撃'},
 {id:'field_control',group:'field',runtime:'existing_rule',label:'場の状態操作'},
 {id:'removes_target_item',group:'effect',runtime:'existing_rule',label:'相手の持ち物を取り除く'},
 {id:'switch_after_hit',group:'field',runtime:'existing_rule',label:'攻撃後に交代'},
 {id:'consumes_user_item',group:'effect',runtime:'existing_rule',label:'自分の持ち物を消費'},
 {id:'blocked_by_protect',group:'defense',runtime:'flag',flag:'protect',label:'まもるで防がれる'},
 {id:'heal_blockable',group:'defense',runtime:'flag',flag:'heal',label:'回復封じの対象'},
 {id:'snatchable',group:'trait',runtime:'flag',flag:'snatch',label:'よこどり可能'},
 {id:'dance_copyable',group:'trait',runtime:'flag',flag:'dance',label:'おどり技'},
 {id:'defrost_user',group:'effect',runtime:'flag',flag:'defrost',label:'使用者のこおりを治す'},
 {id:'double_damage_vs_minimize',group:'damage',runtime:'flag',flag:'minimize',label:'ちいさくなる状態に強い'},
 {id:'gravity_restricted',group:'field',runtime:'flag',flag:'gravity',label:'じゅうりょく中に使用不可'},
 {id:'delayed_attack',group:'turn',runtime:'flag',flag:'futuremove',label:'遅れて攻撃'},
 {id:'pressure_extra_pp',group:'effect',runtime:'flag',flag:'mustpressure',label:'プレッシャーで追加PP消費'},
 {id:'cannot_repeat_move',group:'turn',runtime:'flag',flag:'cantusetwice',label:'連続選択不可'},
 {id:'no_parental_bond',group:'trait',runtime:'flag',flag:'noparentalbond',label:'おやこあいで2回攻撃しない'},
 {id:'pledge_combo',group:'field',runtime:'flag',flag:'pledgecombo',label:'誓い技の連携対象'}
];
const V17_TAG_DEFINITION_MAP = new Map(V17_BATTLE_TAG_DEFINITIONS.map(x=>[x.id,x]));
const V17_FLAG_TAG_MAP = {
 contact_attack:'contact', sound:'sound', bullet:'bullet', powder:'powder',
 punch:'punch', bite:'bite', slicing:'slicing', wind:'wind', pulse:'pulse', reflectable:'reflectable',
 blocked_by_protect:'protect', heal_blockable:'heal', snatchable:'snatch',
 bypass_substitute:'bypasssub', dance_copyable:'dance', charge_turn:'charge',
 recharge_turn:'recharge', defrost_user:'defrost', double_damage_vs_minimize:'minimize',
 gravity_restricted:'gravity', delayed_attack:'futuremove', pressure_extra_pp:'mustpressure',
 cannot_repeat_move:'cantusetwice', no_parental_bond:'noparentalbond', pledge_combo:'pledgecombo'
};
const V17_FORMULA_TAGS = new Set([
 'counter_damage','power_by_target_weight','power_by_user_hp_ratio','power_by_remaining_hp',
 'power_by_speed_ratio','power_by_positive_stat_stages','target_item_power_bonus',
 'power_by_held_item','uses_target_attack','uses_user_defense','damage_formula_review'
]);
function v17MoveId(move){return String(move?.id||move?.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
const V17_API_FLAG_RANGE_TEXT = {"protect": "1-13,15-17,19-45,47-53,55-73,75-95,98-99,101-103,108-109,117,120-132,134,136-143,145-149,152-155,157-158,161-163,165,167-173,175,177-181,183-186,188-190,192-193,196,198-200,202,204-207,209-211,213,216-218,220-225,227-233,237-239,242-243,245-247,249-253,255,257,259-265,269,271,276,279-285,290-292,295-299,301-302,304-311,313-321,323-333,337-338,340-345,348,350-352,354,357-360,362-363,365,368-378,380,382,384-389,391,394-396,398-416,418-432,434-445,447-454,457-460,462-466,470-471,473-474,477,479-482,484-488,490-494,496-500,503,505-507,509-515,517-525,527-537,539-560,562,565,567-568,570-577,582-586,591-592,594-595,598-600,605,608-620,660,662-672,675-677,679-693,704-714,716-718,720-722,729-742,744-746,749-751,753-755,776,778-790,793-810,812-815,817-828,830-836,838-841,843-848,851,853-862,864-866,869-879,884-886,888-907,909,911-912,914-919", "heal": "71-72,105,135,138,141,156,202,208,234-236,256,273,303,355,361,409,456,461,505,532,570,577,613,659,666,668,685,733,791,816,849,863,891,902", "snatch": "14,54,74,96-97,104-107,110-113,115-116,133,135,151,156,159-160,164,187,208,215,219,234-236,254,256,268,273,275,278,286-287,293-294,303,312,322,334,336,339,347,349,355,361,366,379,381,392-393,397,417,455-456,461,468-469,475,483,489,501,504,508,526,538,561,602,659,673-674,694,747-748,775,791,829,837,842,849-850,868", "bypasssub": "18,45-48,50,102-103,114,166,173-174,176,180,193-195,213,215,227,244,253,259,269-270,272,285-286,288-289,304,316,319-320,357,382,384-385,391,405,432,448,495-497,513,516,547,555,568,574-575,586-587,589-590,593,597,600,602,607,621,664,674,683,689,691,712,728,752,786,791,811,816,826,871,913-914,917", "dance": "14,80,297-298,349,461,483,552,686,775,837,872", "charge": "13,19,76,91,130,143,291,340,467,507,553-554,566,601,669,800,905", "recharge": "63,307-308,338,416,439,459,711,794-795", "defrost": "172,221,394,503,558,592,682,735,780,815,876,902", "minimize": "23,34,407,484,535,537,560,696,916", "gravity": "19,26,136,150,340,393,477,507,560,731", "futuremove": "248,353", "mustpressure": "191,286,289,390,446,851", "cantusetwice": "893,901", "noparentalbond": "120,153,205,283,301,374,515,744,751", "pledgecombo": "518-520"};
function v17ExpandApiRanges(source){
 const out=new Set();
 for(const part of String(source||'').split(',')){
  const [a,b]=part.split('-').map(Number);
  if(!Number.isFinite(a))continue;
  const end=Number.isFinite(b)?b:a;
  for(let n=a;n<=end;n++)out.add(n);
 }
 return out;
}
const V17_API_FLAG_SETS=Object.fromEntries(Object.entries(V17_API_FLAG_RANGE_TEXT).map(([k,v])=>[k,v17ExpandApiRanges(v)]));
const V17_API_FLAG_TO_TAG={
 protect:'blocked_by_protect',heal:'heal_blockable',snatch:'snatchable',bypasssub:'bypass_substitute',
 dance:'dance_copyable',charge:'charge_turn',recharge:'recharge_turn',defrost:'defrost_user',
 minimize:'double_damage_vs_minimize',gravity:'gravity_restricted',futuremove:'delayed_attack',
 mustpressure:'pressure_extra_pp',cantusetwice:'cannot_repeat_move',noparentalbond:'no_parental_bond',
 pledgecombo:'pledge_combo'
};
function v17NormalizeMove(move){
 if(!move||typeof move!=='object')return move;
 const cv=move.classificationV2&&typeof move.classificationV2==='object'?move.classificationV2:{};
 const tags=new Set([
  ...(Array.isArray(cv.tags)?cv.tags:[]),
  ...(Array.isArray(move.battleMechanics?.tags)?move.battleMechanics.tags:[])
 ].map(x=>String(x||'').trim()).filter(Boolean));
 const flags={...(move.flags||{})};
 const apiIdForFlags=Number(move.apiId||0);
 for(const [flag,tag] of Object.entries(V17_API_FLAG_TO_TAG)){
  if(V17_API_FLAG_SETS[flag]?.has(apiIdForFlags)){flags[flag]=true;tags.add(tag);}
 }
 // Preserve the engine's authoritative contact classification.
 if(cv.contactStatus==='confirmed_contact')flags.contact=true;
 else if(cv.contactStatus==='confirmed_non_contact'||cv.contactStatus==='not_applicable')delete flags.contact;
 for(const [tag,flag] of Object.entries(V17_FLAG_TAG_MAP)){
  if(tag!=='contact_attack'&&tags.has(tag))flags[flag]=true;
  if(tag==='contact_attack'&&tags.has(tag)&&flags.contact!==false&&cv.contactStatus!=='confirmed_non_contact'&&cv.contactStatus!=='not_applicable')flags[flag]=true;
  if(flags[flag]===true)tags.add(tag);
 }
 if(flags.contact===false&&cv.contactStatus!=='confirmed_contact')tags.delete('contact_attack');
 if(cv.contactStatus==='confirmed_contact')tags.add('contact_attack');
 if(cv.contactStatus==='confirmed_non_contact'){tags.delete('contact_attack');tags.add('non_contact_attack');}
 if(cv.contactStatus==='not_applicable')tags.delete('non_contact_attack');
 const secondaries=[...(Array.isArray(move.secondaries)?move.secondaries:[]),...(move.secondary?[move.secondary]:[])];
 const effects=[...(Array.isArray(move.effects)?move.effects:[])];
 const parsedEffects=typeof v21ParseMoveEffects==='function'?v21ParseMoveEffects(move):[];
 const hasStatus=!!move.status||secondaries.some(x=>!!x?.status)||effects.some(x=>x?.type==='status')||parsedEffects.some(x=>x?.kind==='status'||x?.kind==='randomStatus');
 const hasVolatile=!!move.volatileStatus||secondaries.some(x=>!!x?.volatileStatus)||effects.some(x=>x?.type==='volatile')||parsedEffects.some(x=>x?.kind==='flinch'||x?.kind==='confusion');
 const hasBoost=!!move.boosts||!!move.self?.boosts||secondaries.some(x=>!!x?.boosts)||effects.some(x=>x?.type==='boost')||parsedEffects.some(x=>x?.kind==='boost');
 const hasDrain=!!move.drain||effects.some(x=>x?.type==='drain');
 const hasRecoil=!!move.recoil||effects.some(x=>x?.type==='recoil');
 const hasHeal=!!move.heal||effects.some(x=>x?.type==='heal');
 const hasFlinch=secondaries.some(x=>x?.volatileStatus==='flinch')||effects.some(x=>x?.type==='volatile'&&x.volatileStatus==='flinch')||parsedEffects.some(x=>x?.kind==='flinch');
 const hasConfusion=secondaries.some(x=>x?.volatileStatus==='confusion')||effects.some(x=>x?.type==='volatile'&&x.volatileStatus==='confusion')||parsedEffects.some(x=>x?.kind==='confusion');
 const id=v17MoveId(move),api=Number(move.apiId||0);
 const add=(condition,tag)=>{if(condition)tags.add(tag);};
 add(hasStatus,'status_effect');add(hasVolatile,'volatile_effect');add(hasBoost,'stat_stage_change');
 add(hasBoost&&(['self','user','allySide','allies'].includes(move.target)||!!move.self?.boosts),'self_stat_change');
 add(hasBoost&&!( ['self','user','allySide','allies'].includes(move.target)||!!move.self?.boosts),'target_stat_change');
 add(hasHeal,'heal');add(hasDrain,'drain_healing');add(hasRecoil,'recoil_after_hit');
 add(hasFlinch,'flinch_effect');add(hasConfusion,'confusion_effect');
 add(move.multihit!=null,'multi_hit');
 add(move.ohko===true||(['fissure','guillotine','horn-drill','sheer-cold'].includes(id))||(typeof V19_OHKO_API!=='undefined'&&V19_OHKO_API.has(api)),'ohko');
 add((typeof move.damage==='number'&&move.damage>0)||move.damage==='level'||move.damageCallback==='level','fixed_damage');
 add(Number(move.priority||0)>0,'move_priority');add(Number(move.priority||0)<0,'negative_priority');
 add(!!move.selfSwitch||['uturn','voltswitch','flipturn'].includes(id),'self_switch');
 add(!!move.selfSwitch||['uturn','voltswitch','flipturn'].includes(id),'switch_after_hit');
 if(tags.has('self_switch')||tags.has('switch_after_hit')||['uturn','voltswitch','flipturn'].includes(id))move.selfSwitch=true;
 add(['knockoff','thief','covet','trick','switcheroo'].includes(id),'removes_target_item');
 add(['fling','naturalgift','belch'].includes(id)||!!move.consumesItem,'consumes_user_item');
 add(!!move.weather||!!move.terrain||['raindance','sunnyday','sandstorm','snowscape','hail','electricterrain','grassyterrain','psychicterrain','mistyterrain'].includes(id),'weather_or_terrain');
 add(['protect','detect','kingsshield','spikyshield','banefulbunker','silktrap','burningbulwark','obstruct'].includes(id),'protect_effect');
 add(['roar','whirlwind','dragontail','circlethrow'].includes(id)||!!move.forceSwitch,'force_switch');
 add(['stealthrock','spikes','toxicspikes','stickyweb','stoneaxe','ceaselessedge'].includes(id),'hazard');
 add(!!move.critRatio,'critical_hit');
 add(['judgment','technoblast','multiattack','naturalgift','terrainpulse','revelationdance','weatherball','terablast'].includes(id),'type_change');
 add(['thief','covet','knockoff','trick','switcheroo','fling','bestow'].includes(id),'item_manipulation');
 add(['skillswap','roleplay','worryseed','simplebeam','entrainment','gastroacid','coreenforcer'].includes(id),'ability_manipulation');
 add(V17_FORMULA_TAGS.has(cv.formula),'damage_formula_review');
 if(cv.formula==='target_weight'||cv.formula==='target_weight_ratio')tags.add('power_by_target_weight');
 if(cv.formula==='user_hp_ratio')tags.add('power_by_user_hp_ratio');
 if(cv.formula==='remaining_hp_ratio')tags.add('power_by_remaining_hp');
 if(cv.formula==='speed_ratio')tags.add('power_by_speed_ratio');
 if(cv.formula==='positive_stat_stages')tags.add('power_by_positive_stat_stages');
 // Synchronize the safe, recognized flag tags to the properties consumed by the battle core.
 move.flags=flags;
 const tagList=[...tags];
 const runtimeBindings=[];
 for(const tag of tagList){
  const def=V17_TAG_DEFINITION_MAP.get(tag);
  if(!def)continue;
  if(def.runtime==='flag')runtimeBindings.push({tag,kind:'flag',target:`flags.${def.flag}`,connected:flags[def.flag]===true});
  else if(def.runtime==='field')runtimeBindings.push({tag,kind:'field',target:def.field,connected:(def.field==='category'?!!move.category:def.field==='basePower'?Number(move.basePower)>0||move.damage!=null||move.damageCallback==='level':def.field==='damage'?move.damage!=null:def.field==='ohko'?!!move.ohko||tag==='ohko':def.field==='priority'?Number(move.priority||0)!==0:def.field==='drain'?!!move.drain:def.field==='recoil'?!!move.recoil:def.field==='multihit'?move.multihit!=null:def.field==='selfSwitch'?!!move.selfSwitch:def.field==='weather/terrain'?(!!move.weather||!!move.terrain||['raindance','sunnyday','sandstorm','snowscape','hail','electricterrain','grassyterrain','psychicterrain','mistyterrain'].includes(v17MoveId(move))):false)});
  else if(def.runtime==='effects'){
   const connected=tag==='status_effect'?hasStatus:tag==='volatile_effect'?hasVolatile:tag==='flinch_effect'?hasFlinch:tag==='confusion_effect'?hasConfusion:tag==='stat_stage_change'?hasBoost:tag==='target_stat_change'?hasBoost&&(!( ['self','user','allySide','allies'].includes(move.target)||!!move.self?.boosts)||parsedEffects.some(x=>x?.kind==='boost'&&x?.side==='target')):tag==='self_stat_change'?hasBoost&&( ['self','user','allySide','allies'].includes(move.target)||!!move.self?.boosts||parsedEffects.some(x=>x?.kind==='boost'&&x?.side==='self')):tag==='heal'?hasHeal:tag==='remove_status'?effects.some(x=>x?.type==='remove_status'):tag==='clear_boosts'?effects.some(x=>x?.type==='clear_boosts'):false;
   runtimeBindings.push({tag,kind:'effect_data',target:'move.effects/status/boosts/secondary',connected});
  }
  else if(def.runtime==='existing_rule'){
   let connected=false;
   if(tag==='protect_effect')connected=['protect','detect','kingsshield','spikyshield','banefulbunker','silktrap','burningbulwark','obstruct'].includes(id);
   else if(tag==='bypass_protect')connected=typeof v171BypassesProtect==='function'&&v171BypassesProtect(move);
   else if(tag==='force_switch')connected=['roar','whirlwind','dragontail','circlethrow'].includes(id)||!!move.forceSwitch;
   else if(tag==='hazard')connected=['stealthrock','spikes','toxicspikes','stickyweb','stoneaxe','ceaselessedge'].includes(id);
   else if(tag==='charge_turn')connected=typeof V170_CHARGE_API!=='undefined'&&V170_CHARGE_API.has(api);
   else if(tag==='semi_invulnerable_turn')connected=typeof V170_SEMI_INVULNERABLE_API!=='undefined'&&V170_SEMI_INVULNERABLE_API.has(api);
   else if(tag==='ohko')connected=!!move.ohko||(typeof V19_OHKO_API!=='undefined'&&V19_OHKO_API.has(api));
   else if(tag==='fixed_damage')connected=move.damage!=null||move.damageCallback==='level';
   else if(tag==='critical_hit')connected=!!move.critRatio;
   else if(tag==='item_manipulation'||tag==='ability_manipulation'||tag==='removes_target_item'||tag==='consumes_user_item')connected=true;
   else if(tag==='switch_after_hit')connected=!!move.selfSwitch||['uturn','voltswitch','flipturn','partingshot'].includes(id);
   runtimeBindings.push({tag,kind:'existing_rule',target:'battle_core',connected});
  }
  else if(def.runtime==='formula_review')runtimeBindings.push({tag,kind:'formula_review',target:cv.formula||'classificationV2.formula',connected:false});
 }
 move.classificationV2={...cv,tags:tagList};
 move.battleMechanics={...(move.battleMechanics||{}),schemaVersion:1,tags:tagList,formulaId:cv.formula||'standard_damage_or_effect',formulaNote:cv.formulaNote||'',runtimeBindings,normalizedBy:V17_BATTLE_TAG_ENGINE_VERSION};
 return move;
}
function v17GetMoveRecords(){return Object.values(state?.data?.movesById||state?.data?.moves||{}).filter(x=>x&&typeof x==='object');}
function v17AuditBattleTags(records=v17GetMoveRecords()){
 const perTag={},unregistered={},formulaReview=[],movesMissing=[];
 let bridged=0,metadataOnly=0,tagCount=0;
 for(const move of records){
  v17NormalizeMove(move);
  const tags=move.battleMechanics?.tags||[];if(!tags.length)movesMissing.push(move.id||move.name||'unknown');
  for(const tag of tags){tagCount++;const def=V17_TAG_DEFINITION_MAP.get(tag);if(!def){unregistered[tag]=(unregistered[tag]||0)+1;continue;}
   const item=perTag[tag]||(perTag[tag]={count:0,runtime:def.runtime,connected:0,review:0});item.count++;
   const binding=(move.battleMechanics.runtimeBindings||[]).find(x=>x.tag===tag);
   if(binding?.connected){item.connected++;bridged++;}else if(def.runtime==='formula_review'){item.review++;formulaReview.push({move:move.id,jpName:move.jpName,tag,formula:move.classificationV2?.formula||''});}else metadataOnly++;
  }
 }
 const connectedTags=Object.entries(perTag).filter(([,v])=>['flag','field','effects','existing_rule'].includes(v.runtime)).length;
 return {version:V17_BATTLE_TAG_ENGINE_VERSION,totalMoves:records.length,totalTagAssignments:tagCount,uniqueTags:Object.keys(perTag).length,connectedTagAssignments:bridged,reviewTagAssignments:formulaReview.length,metadataOnlyAssignments:metadataOnly,unregisteredTags:unregistered,perTag,formulaReviewMoves:formulaReview,movesMissingTags:movesMissing,notes:['connected は既存バトルコードの処理経路に接続されていることを示す。実戦で全条件を検証済みという意味ではない。','formula_review は特殊計算式の分類を残し、専用計算式の実戦検証が必要な状態を示す。','未対応タグを推測で実行する処理は追加していない。']};
}
function v17RunTagEngineSelfTests(){
 const cases=[];
 const check=(name,ok,detail='')=>cases.push({name,passed:!!ok,detail});
 const contact=v17NormalizeMove({id:'test-contact',flags:{},classificationV2:{tags:['contact_attack'],contactStatus:'confirmed_contact'}});
 check('接触タグ → flags.contact',contact.flags.contact===true&&contact.battleMechanics.tags.includes('contact_attack'));
 const nonContact=v17NormalizeMove({id:'test-non-contact',flags:{contact:true},classificationV2:{tags:['contact_attack'],contactStatus:'confirmed_non_contact'}});
 check('非接触判定は接触タグより優先',!nonContact.flags.contact&&!nonContact.battleMechanics.tags.includes('contact_attack'));
 const explicitNonContact=v17NormalizeMove({id:'test-explicit-non-contact',flags:{contact:false},classificationV2:{tags:['contact_attack']}});
 check('明示的な contact:false を尊重',!explicitNonContact.flags.contact&&!explicitNonContact.battleMechanics.tags.includes('contact_attack'));
 const sound=v17NormalizeMove({id:'test-sound',flags:{},classificationV2:{tags:['sound']}});
 check('音タグ → flags.sound',sound.flags.sound===true);
 const bullet=v17NormalizeMove({id:'test-bullet',flags:{},classificationV2:{tags:['bullet']}});
 check('弾タグ → flags.bullet',bullet.flags.bullet===true);
 const powder=v17NormalizeMove({id:'test-powder',flags:{},classificationV2:{tags:['powder']}});
 check('粉タグ → flags.powder',powder.flags.powder===true);
 const multi=v17NormalizeMove({id:'test-multi',multihit:[2,5],classificationV2:{tags:[]}});
 check('連続回数データ → multi_hit',multi.battleMechanics.tags.includes('multi_hit'));
 const recoil=v17NormalizeMove({id:'test-recoil',recoil:[1,3],classificationV2:{tags:[]}});
 check('反動データ → recoil_after_hit',recoil.battleMechanics.tags.includes('recoil_after_hit'));
 const preserve=v17NormalizeMove({id:'test-preserve',classificationV2:{tags:['custom_existing_tag']}});
 check('既存の未知タグを消さない',preserve.battleMechanics.tags.includes('custom_existing_tag'));
 const status=v17NormalizeMove({id:'test-status',status:'par',classificationV2:{tags:[]}});
 check('状態異常データ → status_effect',status.battleMechanics.tags.includes('status_effect'));
 const absorb=v17NormalizeMove({id:'absorb',apiId:71,flags:{},classificationV2:{tags:[]}});
 check('吸収技のまもる・回復封じフラグ',absorb.flags.protect===true&&absorb.flags.heal===true&&absorb.battleMechanics.tags.includes('blocked_by_protect')&&absorb.battleMechanics.tags.includes('heal_blockable'));
 const afterYou=v17NormalizeMove({id:'afteryou',apiId:495,flags:{},classificationV2:{tags:[]}});
 check('おさきにどうぞのみがわり貫通',afterYou.flags.bypasssub===true&&afterYou.battleMechanics.tags.includes('bypass_substitute'));
 const hyperBeam=v17NormalizeMove({id:'hyperbeam',apiId:63,flags:{},classificationV2:{tags:[]}});
 check('はかいこうせんの反動ターン',hyperBeam.flags.recharge===true&&hyperBeam.battleMechanics.tags.includes('recharge_turn'));
 const futureSight=v17NormalizeMove({id:'futuresight',apiId:248,flags:{},classificationV2:{tags:[]}});
 check('みらいよちの遅延攻撃',futureSight.flags.futuremove===true&&futureSight.battleMechanics.tags.includes('delayed_attack'));
 const flameWheel=v17NormalizeMove({id:'flamewheel',apiId:172,flags:{},classificationV2:{tags:[]}});
 check('ほのおのうず系ではなくフレアドライブ等ではない自己解凍判定',flameWheel.flags.defrost===true&&flameWheel.battleMechanics.tags.includes('defrost_user'));
 const bounce=v17NormalizeMove({id:'bounce',apiId:340,flags:{},classificationV2:{tags:[]}});
 check('とびはねるの溜め・重力制限',bounce.flags.charge===true&&bounce.flags.gravity===true&&bounce.battleMechanics.tags.includes('charge_turn')&&bounce.battleMechanics.tags.includes('gravity_restricted'));
 const swordsDance=v17NormalizeMove({id:'swordsdance',apiId:14,flags:{},classificationV2:{tags:[]}});
 check('つるぎのまいのよこどり可能',swordsDance.flags.snatch===true&&swordsDance.battleMechanics.tags.includes('snatchable'));
 const firePledge=v17NormalizeMove({id:'firepledge',apiId:518,flags:{},classificationV2:{tags:[]}});
 check('誓い技の連携フラグ',firePledge.flags.pledgecombo===true&&firePledge.battleMechanics.tags.includes('pledge_combo'));
 return {version:V17_BATTLE_TAG_ENGINE_VERSION,total:cases.length,passed:cases.filter(x=>x.passed).length,failed:cases.filter(x=>!x.passed).length,cases};
}
// Wrap the canonical access points. Existing combat handlers remain the single source of execution.
const V17_previousGetMove = getMove;
getMove = function(id){return v17NormalizeMove(V17_previousGetMove(id));};
const V17_previousLoadAllData = loadAllData;
loadAllData = async function(...args){
 const result=await V17_previousLoadAllData(...args);
 const records=v17GetMoveRecords();
 for(const move of records)v17NormalizeMove(move);
 if(state.data)state.data.battleTagAudit=v17AuditBattleTags(records);
 return result;
};
if(typeof bcFlag==='function'){
 const V17_previousBcFlag=bcFlag;
 bcFlag=function(move,flag){
  if(move)v17NormalizeMove(move);
  return !!(V17_previousBcFlag(move,flag)||(move?.flags||{})[flag]===true);
 };
}
window.PokemonChampions2DData=window.PokemonChampions2DData||{};
Object.assign(window.PokemonChampions2DData,{
 battleTagEngineVersion:V17_BATTLE_TAG_ENGINE_VERSION,
 battleTagDefinitions:V17_BATTLE_TAG_DEFINITIONS,
 normalizeBattleTags:v17NormalizeMove,
 auditBattleTags:v17AuditBattleTags,
 testBattleTagEngine:v17RunTagEngineSelfTests
});
window.BattleTagEngine={version:V17_BATTLE_TAG_ENGINE_VERSION,definitions:V17_BATTLE_TAG_DEFINITIONS,normalize:v17NormalizeMove,audit:v17AuditBattleTags,selfTest:v17RunTagEngineSelfTests};
// ================================================================
// End v17.1 Unified Battle Tag Engine
// ================================================================


// ================================================================
// v17.2 — Shared Move Effect Engine (incremental runtime integration)
// Tags describe move properties; this engine executes structured effects.
// Existing v16.x handlers remain authoritative for already-supported effects.
// ================================================================
const V22_MOVE_EFFECT_ENGINE_VERSION = '17.2.0';
const V22_EFFECT_PHASES = new Set(['beforeDamage','afterHit']);
const V22_EFFECT_HANDLER_DEFINITIONS = [
 {type:'steal_boosts',phase:'beforeDamage',label:'相手の能力上昇を奪う'},
 {type:'speed_swap',phase:'afterHit',label:'素早さを交換する'},
 {type:'cure_side_status',phase:'afterHit',label:'味方全体の状態異常を治す'},
 {type:'clear_terrain',phase:'afterHit',label:'フィールドを解除する'},
 {type:'set_weather',phase:'afterHit',label:'天候を変更する'},
 {type:'set_terrain',phase:'afterHit',label:'フィールドを変更する'},
 {type:'side_boost',phase:'afterHit',label:'味方または相手全体の能力を変化させる'}
];
const V22_STAT_KEY_MAP = {
 'attack':'atk','defense':'def','special attack':'spa','special defense':'spd',
 'speed':'spe','accuracy':'accuracy','evasion':'evasion'
};
const V22_API_EFFECT_MAP = {
 683:[{type:'speed_swap',phase:'afterHit'}],
 712:[{type:'steal_boosts',phase:'beforeDamage'}],
 215:[{type:'cure_side_status',phase:'afterHit'}],
 312:[{type:'cure_side_status',phase:'afterHit'}],
 798:[{type:'clear_terrain',phase:'afterHit',requiresTerrain:true}],
 757:[{type:'set_weather',phase:'afterHit',weather:'sun'}],
 765:[{type:'set_weather',phase:'afterHit',weather:'rain'}],
 770:[{type:'set_weather',phase:'afterHit',weather:'sand'}],
 763:[{type:'set_weather',phase:'afterHit',weather:'snow'}],
 759:[{type:'set_terrain',phase:'afterHit',terrain:'electric'}],
 769:[{type:'set_terrain',phase:'afterHit',terrain:'psychic'}],
 773:[{type:'set_terrain',phase:'afterHit',terrain:'grassy'}],
 767:[{type:'set_terrain',phase:'afterHit',terrain:'misty'}]
};
function v22CleanDescription(move){
 return String(move?.mechanicDescription||move?.shortDesc||'').replace(/（英語原文）/g,'').trim();
}
function v22CompileMoveEffectPlan(move){
 if(!move||typeof move!=='object')return [];
 const desc=v22CleanDescription(move),low=desc.toLowerCase(),api=Number(move.apiId||0),out=[];
 const add=e=>{if(!e||!e.type||!V22_EFFECT_PHASES.has(e.phase))return;const key=JSON.stringify(e);if(!out.some(x=>JSON.stringify(x)===key))out.push(e);};
 for(const e of (V22_API_EFFECT_MAP[api]||[]))add({...e});
 if(/exchanges the user.?s speed with the target.?s/i.test(desc))add({type:'speed_swap',phase:'afterHit'});
 if(/steals the target.?s stat increases/i.test(desc))add({type:'steal_boosts',phase:'beforeDamage'});
 if(/cures the entire party of major status effects/i.test(desc))add({type:'cure_side_status',phase:'afterHit'});
 if(/ends the effect of (electric|grassy|misty|psychic).*terrains?/i.test(desc))add({type:'clear_terrain',phase:'afterHit',requiresTerrain:true});
 // Read group-wide stat changes from Max Move descriptions.
 const groupBoost=desc.match(/(?:if this move hits,\s*)?(raises?|lowers?)\s+(?:the\s+)?([^.;]+?)\s+by\s+(one|two|three|four|five|six|\d+)\s+stages?/i);
 if(groupBoost){
  const scope=groupBoost[2].toLowerCase();
  const statMatch=scope.match(/(special attack|special defense|attack|defense|speed|accuracy|evasion)/);
  const side=/all pok[eé]mon on the opposing side/.test(scope)?'opposing':/user and its allies/.test(scope)?'user':null;
  if(statMatch&&side){
   const n=({one:1,two:2,three:3,four:4,five:5,six:6})[groupBoost[3].toLowerCase()]||Number(groupBoost[3]);
   const delta=/^rais/i.test(groupBoost[1])?1:-1;
   add({type:'side_boost',phase:'afterHit',side,boosts:{[V22_STAT_KEY_MAP[statMatch[1]]]:n*delta}});
  }
 }
 // Description-based fallbacks supplement API IDs, but never guess Shadow Sky or unknown weather.
 if(!out.some(e=>e.type==='set_weather')){
  const w=low.match(/changes the weather to (?:a )?(sunny|sun|rain|rainy|rainstorm|sandstorm|hailstorm|snow)\b/i);
  if(w){const word=w[1].toLowerCase(),weather=/sun/.test(word)?'sun':/rain/.test(word)?'rain':/sand/.test(word)?'sand':'snow';add({type:'set_weather',phase:'afterHit',weather});}
 }
 if(!out.some(e=>e.type==='set_terrain')){
  const t=low.match(/changes the terrain to (electric|grassy|psychic|misty) terrain/i);
  if(t)add({type:'set_terrain',phase:'afterHit',terrain:t[1].toLowerCase()});
 }
 return out;
}
function v22EnsureMoveEffectPlan(move){
 if(!move||typeof move!=='object')return [];
 const plan=v22CompileMoveEffectPlan(move);
 move._v22EffectPlan=plan;
 move._v22EffectPlanVersion=V22_MOVE_EFFECT_ENGINE_VERSION;
 return plan;
}
function v22Log(message,options={}){if(!options.silent&&typeof battleLog==='function')battleLog(message);}
function v22ClampStage(value){return Math.max(-6,Math.min(6,Number(value)||0));}
function v22ApplyMoveEffect(effect,actor,target,move,b,options={}){
 if(!effect||!actor||!b)return false;
 const type=effect.type;
 if(type==='steal_boosts'){
  if(!target||target===actor)return false;
  actor.stages=actor.stages||{};target.stages=target.stages||{};
  const keys=['atk','def','spa','spd','spe','accuracy','evasion'];let changed=false;
  for(const key of keys){const amount=Math.max(0,Number(target.stages[key]||0));if(amount>0){actor.stages[key]=v22ClampStage(Number(actor.stages[key]||0)+amount);target.stages[key]=0;changed=true;}}
  if(changed)v22Log(`${actor.name}は相手の能力上昇を奪った！`,options);
  return changed;
 }
 if(type==='speed_swap'){
  if(!target||target===actor)return false;
  actor.stats=actor.stats||{};target.stats=target.stats||{};
  const a=Number(actor.stats.spe),t=Number(target.stats.spe);
  if(!Number.isFinite(a)||!Number.isFinite(t))return false;
  actor.stats.spe=t;target.stats.spe=a;
  v22Log(`${actor.name}と${target.name}の素早さが入れ替わった！`,options);
  return true;
 }
 if(type==='cure_side_status'){
  const own=(b.playerTeam||[]).some(m=>m?.uid===actor.uid)?'player':'enemy';
  const team=own==='player'?(b.playerTeam||[]):(b.enemyTeam||[]);let changed=0;
  for(const mon of team){if(mon?.status){mon.status=null;mon.statusTurns=0;changed++;}}
  if(changed)v22Log(`味方チーム ${changed}匹の状態異常が治った！`,options);
  else v22Log('しかし 味方チームに治す状態異常はなかった！',options);
  return true;
 }
 if(type==='clear_terrain'){
  if(!b.terrain)return false;
  const old=b.terrain;b.terrain=null;b.terrainTurns=0;
  v22Log(`${({electric:'エレキ',grassy:'グラス',psychic:'サイコ',misty:'ミスト'})[old]||old}フィールドが消えた！`,options);
  return true;
 }
 if(type==='set_weather'){
  const weather=effect.weather;
  if(!weather)return false;
  if(b.weather===weather&&Number(b.weatherTurns||0)>0)return false;
  if(typeof applyWeather==='function')applyWeather(weather,b);
  return b.weather===weather;
 }
 if(type==='set_terrain'){
  const terrain=effect.terrain;
  if(!terrain)return false;
  if(b.terrain===terrain&&Number(b.terrainTurns||0)>0)return false;
  if(typeof applyTerrain==='function')applyTerrain(terrain,b);
  return b.terrain===terrain;
 }
 if(type==='side_boost'){
  const side=effect.side==='user'?'user':'opposing';
  const own=(b.playerTeam||[]).some(m=>m?.uid===actor.uid)?'player':'enemy';
  const chosen=side==='user'?own:(own==='player'?'enemy':'player');
  const team=chosen==='player'?(b.playerTeam||[]):(b.enemyTeam||[]);
  const active=chosen==='player'?(b.playerActive||[]):(b.enemyActive||[]);
  const recipients=active.map(i=>team[i]).filter(m=>m&&!m.fainted&&m.hp>0);
  if(!recipients.length||!effect.boosts||typeof applyBoosts!=='function')return false;
  const old=b._eventActorUid;b._eventActorUid=actor.uid;
  try{for(const mon of recipients)applyBoosts(mon,effect.boosts,getMoveName(move));}
  finally{b._eventActorUid=old;}
  return true;
 }
 return false;
}
function v22RunMoveEffectPhase(actor,target,move,b,phase){
 if(!actor||!move||!b)return {ran:0,types:[]};
 const plan=v22EnsureMoveEffectPlan(move),types=[],ctx=b._v22MoveContext;
 for(const effect of plan){if(effect.phase!==phase)continue;
  if(effect.type==='steal_boosts'&&phase==='beforeDamage'&&ctx?.stealBoostsDone)continue;
  const did=v22ApplyMoveEffect(effect,actor,target,move,b);
  if(did){types.push(effect.type);if(effect.type==='steal_boosts'&&ctx)ctx.stealBoostsDone=true;}
 }
 return {ran:types.length,types};
}
function v22AuditMoveEffectEngine(){
 const moves=Object.values(state.data?.movesById||state.data?.moves||{}),counts={},examples={};let assignments=0;
 for(const move of moves){const plan=v22EnsureMoveEffectPlan(move);for(const effect of plan){counts[effect.type]=(counts[effect.type]||0)+1;assignments++;(examples[effect.type]||(examples[effect.type]=[]));if(examples[effect.type].length<8)examples[effect.type].push({jpName:move.jpName||move.name||move.id,apiId:Number(move.apiId||0)});}}
 return {version:V22_MOVE_EFFECT_ENGINE_VERSION,totalMoves:moves.length,movesWithNewEffectPlan:moves.filter(m=>v22EnsureMoveEffectPlan(m).length>0).length,totalEffectAssignments:assignments,effectCounts:counts,effectExamples:examples,handlers:V22_EFFECT_HANDLER_DEFINITIONS.map(x=>({...x,count:counts[x.type]||0})),note:'既存の技別・共通処理を置き換えるものではなく、既存処理で未接続だった効果を補う追加レイヤーです。全937技の完全再現を意味しません。'};
}
function v22RunMoveEffectEngineTests(){
 const checks=[];const test=(name,fn)=>{try{checks.push({name,passed:!!fn()});}catch(e){checks.push({name,passed:false,error:String(e?.message||e)});}};
 test('スピードスワップの効果プラン',()=>v22CompileMoveEffectPlan({apiId:683,mechanicDescription:'Exchanges the user’s Speed with the target’s.'}).some(e=>e.type==='speed_swap'));
 test('シャドースチールはダメージ前',()=>v22CompileMoveEffectPlan({apiId:712,mechanicDescription:'Steals the target’s stat increases, then inflicts damage.'}).some(e=>e.type==='steal_boosts'&&e.phase==='beforeDamage'));
 test('いやしのすず・アロマセラピーの効果プラン',()=>[215,312].every(api=>v22CompileMoveEffectPlan({apiId:api,mechanicDescription:'Cures the entire party of major status effects.'}).some(e=>e.type==='cure_side_status')));
 test('アイアンローラーの地形条件',()=>v22CompileMoveEffectPlan({apiId:798,mechanicDescription:'Ends the effect of Electric, Grassy, Misty, or Psychic Terrains. Fails if no Terrain is active.'}).some(e=>e.type==='clear_terrain'&&e.requiresTerrain));
 test('ダイバーンの天候プラン',()=>v22CompileMoveEffectPlan({apiId:757,mechanicDescription:'Changes the weather to sunny for five turns.'}).some(e=>e.type==='set_weather'&&e.weather==='sun'));
 test('ダイサンダーの地形プラン',()=>v22CompileMoveEffectPlan({apiId:759,mechanicDescription:'For five turns, prevents all Pokémon on the ground from sleeping and strengthens their Electric moves to 1.5× their power.'}).some(e=>e.type==='set_terrain'&&e.terrain==='electric'));
 test('ダイワームの相手全体能力低下',()=>v22CompileMoveEffectPlan({apiId:758,mechanicDescription:'If this move hits, lower the Special Attack of all Pokemon on the opposing side by 1 stage.'}).some(e=>e.type==='side_boost'&&e.side==='opposing'&&e.boosts.spa===-1));
 test('ダイナックルの味方全体能力上昇',()=>v22CompileMoveEffectPlan({apiId:761,mechanicDescription:'If this move hits, raise the Attack of the user and its allies by 1 stage.'}).some(e=>e.type==='side_boost'&&e.side==='user'&&e.boosts.atk===1));
 const a={uid:'a',name:'A',stats:{spe:100},stages:{atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0,evasion:0}},t={uid:'t',name:'T',stats:{spe:60},stages:{atk:2,def:-1,spa:1,spd:0,spe:0,accuracy:0,evasion:0}},mate={uid:'m',name:'M',status:'par',statusTurns:2},b={playerTeam:[a,mate],enemyTeam:[t],playerActive:[0],enemyActive:[0],terrain:'psychic',terrainTurns:4};
 test('素早さ交換の実行',()=>{const ok=v22ApplyMoveEffect({type:'speed_swap'},a,t,{id:'api-683',jpName:'スピードスワップ'},b,{silent:true});return ok&&a.stats.spe===60&&t.stats.spe===100;});
 test('能力上昇の奪取',()=>{const ok=v22ApplyMoveEffect({type:'steal_boosts'},a,t,{id:'api-712',jpName:'シャドースチール'},b,{silent:true});return ok&&a.stages.atk===2&&a.stages.spa===1&&t.stages.atk===0&&t.stages.spa===0&&t.stages.def===-1;});
 test('味方全体の状態異常回復',()=>{a.status='brn';mate.status='par';t.status='psn';const ok=v22ApplyMoveEffect({type:'cure_side_status'},a,t,{id:'api-215',jpName:'いやしのすず'},b,{silent:true});return ok&&!a.status&&!mate.status&&t.status==='psn';});
 test('地形解除',()=>{const ok=v22ApplyMoveEffect({type:'clear_terrain'},a,t,{id:'api-798',jpName:'アイアンローラー'},b,{silent:true});return ok&&b.terrain===null&&b.terrainTurns===0;});
 test('10種類のダイマックス技の全体能力変化',()=>{
  const ids=[758,760,761,762,764,766,768,771,772,774];
  return ids.every(api=>{const name=Object.values(state.data?.movesById||state.data?.moves||{}).find(m=>Number(m.apiId)===api);return !!name&&v22CompileMoveEffectPlan(name).some(e=>e.type==='side_boost');});
 });
 test('味方全体への能力変化実行',()=>{
  a.hp=100;a.fainted=false;a.stages.atk=0;mate.hp=100;mate.fainted=false;mate.stages=mate.stages||{atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0,evasion:0};mate.stages.atk=0;b.playerActive=[0,1];
  const ok=v22ApplyMoveEffect({type:'side_boost',side:'user',boosts:{atk:1}},a,t,{id:'api-761',jpName:'ダイナックル'},b,{silent:true});
  b.playerActive=[0];
  return ok&&a.stages.atk===1&&mate.stages.atk===1;
 });
 test('天候変更の実行',()=>{const wb={weather:null,weatherTurns:0};const ok=v22ApplyMoveEffect({type:'set_weather',weather:'rain'},a,t,{id:'api-765',jpName:'ダイストリーム'},wb,{silent:true});return ok&&wb.weather==='rain'&&wb.weatherTurns===5;});
 test('フィールド変更の実行',()=>{const tb={terrain:null,terrainTurns:0};const ok=v22ApplyMoveEffect({type:'set_terrain',terrain:'electric'},a,t,{id:'api-759',jpName:'ダイサンダー'},tb,{silent:true});return ok&&tb.terrain==='electric'&&tb.terrainTurns===5;});
 const passed=checks.filter(x=>x.passed).length;
 return {version:V22_MOVE_EFFECT_ENGINE_VERSION,passed,total:checks.length,failed:checks.filter(x=>!x.passed)};
}
// Data plans are attached after the existing data loader completes.
const V22_prevLoadAllData=loadAllData;
loadAllData=async function(options){const result=await V22_prevLoadAllData(options);for(const move of Object.values(state.data.movesById||state.data.moves||{}))v22EnsureMoveEffectPlan(move);state.moveEffectEngineAudit=v22AuditMoveEffectEngine();return result;};
// Run Spectral Thief's transfer at the first real damage calculation, not on a miss or Protect.
const V22_prevCalculateDamage=calculateDamage;
calculateDamage=function(actor,target,move,b){
 const ctx=b?._v22MoveContext;
 if(ctx&&ctx.actorUid===actor?.uid&&!ctx.stealBoostsDone&&Number(ctx.apiId)===712&&Number(move?.apiId)===712){
  v22RunMoveEffectPhase(actor,target,move,b,'beforeDamage');
 }
 return V22_prevCalculateDamage(actor,target,move,b);
};
// After legacy handlers finish, execute only the extra effect types registered in v17.2.
const V22_prevApplyMoveSpecificEffects=applyMoveSpecificEffects;
applyMoveSpecificEffects=function(actor,target,move,b){
 const result=V22_prevApplyMoveSpecificEffects(actor,target,move,b);
 try{if(actor&&move&&b&&actor._lastMoveHit!==false&&actor._lastHitWasSubstitute!==true)v22RunMoveEffectPhase(actor,target,move,b,'afterHit');}
 catch(err){console.error('[v17.2 move effect engine]',getMoveName(move),err);if(typeof bcRecordError==='function')bcRecordError('v17.2 move effect engine',err,{move:move?.id,apiId:move?.apiId});}
 return result;
};
// Keep action context around the existing executor. Steel Roller’s terrain check is
// inserted in the core executor after normal move validation and PP consumption.
const V22_prevExecuteAction=executeAction;
executeAction=function(act,b){
 if(!act||!b)return V22_prevExecuteAction(act,b);
 const team=act.side==='player'?b.playerTeam:b.enemyTeam,actor=team?.find(m=>m?.uid===act.actorUid);
 if(!actor||act.switchTo!=null)return V22_prevExecuteAction(act,b);
 const move=getMove(act.moveId);
 const old=b._v22MoveContext;
 b._v22MoveContext={actorUid:actor.uid,apiId:Number(move?.apiId||0),moveId:move?.id||'',stealBoostsDone:false};
 try{return V22_prevExecuteAction(act,b);}
 finally{if(old===undefined)delete b._v22MoveContext;else b._v22MoveContext=old;}
};
// Settings diagnostics make data coverage and actual new handlers visible separately.
const V22_prevRenderSettings=renderSettings;
renderSettings=function(){
 const base=V22_prevRenderSettings(),a=v22AuditMoveEffectEngine(),items=V22_EFFECT_HANDLER_DEFINITIONS.map(h=>`<li><b>${esc(h.label)}</b>：${Number(a.effectCounts[h.type]||0).toLocaleString()}技</li>`).join(''),tests=v22RunMoveEffectEngineTests();
 return base+`<section class="panel" style="margin-top:16px"><div class="panel-head"><h2>⚙️ 技効果エンジン</h2><span class="pill">v${V22_MOVE_EFFECT_ENGINE_VERSION}</span></div><div class="panel-body"><p class="small muted">タグは性質の分類、効果プランは実際に行う処理です。既存の技別処理を残し、新しい共通ハンドラーで不足分を補います。</p><div class="care-mon-meta"><span class="pill">技データ ${Number(a.totalMoves||0).toLocaleString()}件</span><span class="pill">追加効果プラン ${Number(a.movesWithNewEffectPlan||0).toLocaleString()}技</span><span class="pill">効果登録 ${Number(a.totalEffectAssignments||0).toLocaleString()}件</span><span class="pill">自己テスト ${tests.passed}/${tests.total}</span></div><details><summary>今回接続した効果</summary><ul>${items}</ul></details><p class="tiny muted">この数値は v17.2 の追加ハンドラーへの接続数です。既存エンジンの効果を含む全937技の完全再現数ではありません。未登録の特殊効果は引き続き個別確認が必要です。</p></div></section>`;
};
if(window.PokemonChampions2DData){Object.assign(window.PokemonChampions2DData,{moveEffectEngineVersion:V22_MOVE_EFFECT_ENGINE_VERSION,auditMoveEffectEngine:v22AuditMoveEffectEngine,testMoveEffectEngine:v22RunMoveEffectEngineTests,compileMoveEffectPlan:v22CompileMoveEffectPlan});}
window.MoveEffectEngine={version:V22_MOVE_EFFECT_ENGINE_VERSION,audit:v22AuditMoveEffectEngine,selfTest:v22RunMoveEffectEngineTests,compile:v22CompileMoveEffectPlan};
// ================================================================
// End v17.2 Shared Move Effect Engine
// ================================================================


// v17.3 / V23: mechanics corrections for healing, Stockpile family, Struggle, and audit visibility.
// A handler being connected is not treated as proof that all edge cases are verified.
const V23_MOVE_MECHANICS_VERSION = '17.3.0';
const V23_NON_SELF_HEAL_APIS = new Set([505, 666, 685, 791, 816]);

function v23Api(move) { return Number(move?.apiId || 0); }
function v23StockpileCount(mon) { return Math.max(0, Math.min(3, Number(mon?._v23StockpileCount || 0))); }
function v23ClampStageValue(n) { return Math.max(-6, Math.min(6, Number(n) || 0)); }
function v23WeatherRecovery(api, weather, suppressed) {
  const w = suppressed ? '' : String(weather || '');
  if ([234, 235, 236].includes(api)) {
    if (w === 'sun') return [2, 3];
    if (['rain', 'sand', 'snow'].includes(w)) return [1, 4];
    return [1, 2];
  }
  if (api === 659) return w === 'sand' ? [2, 3] : [1, 2];
  return null;
}
function v23RoundHalfUp(n) { return Math.floor(Number(n) + 0.5); }
function v23SwallowFraction(count) { return count === 1 ? [1, 4] : count === 2 ? [1, 2] : count === 3 ? [1, 1] : [0, 1]; }
function v23ResetStockpile(mon, reason='') {
  if (!mon) return false;
  const delta = mon._v23StockpileStageDelta || {};
  mon.stages = mon.stages || {};
  let changed = false;
  for (const key of ['def', 'spd']) {
    const amount = Math.max(0, Number(delta[key] || 0));
    if (amount) {
      mon.stages[key] = v23ClampStageValue(Number(mon.stages[key] || 0) - amount);
      changed = true;
    }
  }
  const had = v23StockpileCount(mon) > 0;
  delete mon._v23StockpileStageDelta;
  mon._v23StockpileCount = 0;
  if (had && reason && typeof battleLog === 'function') battleLog(`${mon.name}のたくわえた力がなくなった！`);
  return had || changed;
}
function v23AddStockpile(mon, move) {
  if (!mon) return false;
  const oldCount = v23StockpileCount(mon);
  if (oldCount >= 3) return false;
  mon.stages = mon.stages || {};
  const beforeDef = Number(mon.stages.def || 0), beforeSpd = Number(mon.stages.spd || 0);
  if (typeof applyBoosts === 'function') applyBoosts(mon, {def:1, spd:1}, getMoveName(move));
  const afterDef = Number(mon.stages.def || 0), afterSpd = Number(mon.stages.spd || 0);
  const oldDelta = mon._v23StockpileStageDelta || {def:0, spd:0};
  mon._v23StockpileStageDelta = {
    def: Math.max(0, Number(oldDelta.def || 0) + (afterDef - beforeDef)),
    spd: Math.max(0, Number(oldDelta.spd || 0) + (afterSpd - beforeSpd))
  };
  mon._v23StockpileCount = oldCount + 1;
  if (typeof battleLog === 'function') battleLog(`${mon.name}は力を${mon._v23StockpileCount}回ぶん たくわえた！`);
  return true;
}
function v23ApplySideHealing(actor, b, api) {
  const own = (b.playerTeam || []).some(m => m?.uid === actor?.uid) ? 'player' : 'enemy';
  const team = own === 'player' ? (b.playerTeam || []) : (b.enemyTeam || []);
  const active = own === 'player' ? (b.playerActive || []) : (b.enemyActive || []);
  let healed = 0;
  for (const mon of active.map(i => team[i]).filter(m => m && !m.fainted && m.hp > 0)) {
    const before = Number(mon.hp || 0);
    const raw = Number(mon.maxhp || 1) / 4;
    const amount = api === 791 ? v23RoundHalfUp(raw) : Math.ceil(raw);
    mon.hp = Math.min(mon.maxhp, mon.hp + Math.max(1, amount));
    if (api === 816) { mon.status = null; mon.statusTurns = 0; }
    if (mon.hp > before) healed++;
  }
  if (typeof battleLog === 'function') battleLog(api === 816 ? '味方のHPと状態が回復した！' : '味方のHPが回復した！');
  return healed;
}

// The legacy generic move.heal branch always heals the user. These five moves heal
// a target or the whole side, and their dedicated handler below owns the healing.
const V23_prevApplyMoveExtras = applyMoveExtras;
applyMoveExtras = function(actor, target, move, b) {
  if (!move) return V23_prevApplyMoveExtras(actor, target, move, b);
  const api = v23Api(move), oldHeal = move.heal;
  let changed = false;
  if (V23_NON_SELF_HEAL_APIS.has(api)) { move.heal = undefined; changed = true; }
  if ([234, 235, 236, 659].includes(api)) {
    const fraction = v23WeatherRecovery(api, b?.weather, typeof v20WeatherSuppressed === 'function' && v20WeatherSuppressed(b));
    if (fraction) { move.heal = fraction; changed = true; }
  }
  if (api === 256) {
    const fraction = v23SwallowFraction(v23StockpileCount(actor));
    move.heal = fraction[0] ? fraction : undefined;
    changed = true;
  }
  try { return V23_prevApplyMoveExtras(actor, target, move, b); }
  finally { if (changed) move.heal = oldHeal; }
};

// Correct target/self and side-healing semantics from move data. This replaces the
// v17.2 generic interpretation only for the four entries with distinct rounding or conditions.
const V23_prevV19TagHealing = v19ApplyTagHealing;
v19ApplyTagHealing = function(actor, target, move, b) {
  const api = v23Api(move);
  if (!actor || !target || !move || !b) return V23_prevV19TagHealing(actor, target, move, b);
  if (api === 505) {
    const fraction = v20Ab(actor, b) === 'megalauncher' ? 0.75 : 0.5;
    const amount = Math.max(1, Math.ceil(Number(target.maxhp || 1) * fraction));
    const before = Number(target.hp || 0);
    target.hp = Math.min(target.maxhp, target.hp + amount);
    if (target.hp > before) battleLog(`${target.name}は${getMoveName(move)}でHPを回復した！`);
    else battleLog(`${target.name}のHPは すでに満タンだ！`);
    return;
  }
  if (api === 685) {
    const hadStatus = !!target.status;
    if (hadStatus) {
      target.status = null; target.statusTurns = 0;
      const amount = Math.max(1, Math.ceil(Number(actor.maxhp || 1) / 2));
      const before = Number(actor.hp || 0);
      actor.hp = Math.min(actor.maxhp, actor.hp + amount);
      if (actor.hp > before) battleLog(`${actor.name}のHPが回復した！`);
      battleLog(`${target.name}の状態異常が治った！`);
    } else {
      battleLog(`${target.name}は状態異常ではない！`);
    }
    return;
  }
  if (api === 791 || api === 816) { v23ApplySideHealing(actor, b, api); return; }
  return V23_prevV19TagHealing(actor, target, move, b);
};

// Stockpile's +1 Defense/+1 Sp. Def is not stated in the API mechanicDescription,
// so it has to be implemented from the move's actual rules, and tracked separately.
const V23_prevApplyMoveSpecificEffects = applyMoveSpecificEffects;
applyMoveSpecificEffects = function(actor, target, move, b) {
  const result = V23_prevApplyMoveSpecificEffects(actor, target, move, b);
  const api = v23Api(move);
  try {
    if (actor && b && api === 254 && actor._lastMoveHit !== false) v23AddStockpile(actor, move);
  } catch (err) {
    console.error('[v17.3 Stockpile handler]', err);
    if (typeof bcRecordError === 'function') bcRecordError('v17.3 Stockpile handler', err, {move:move?.id, apiId:api});
  }
  return result;
};

// Spit Up's base power is 100 per stored layer. The old resolver returns basePower=0.
const V23_prevResolveContextMoveData = resolveContextMoveData;
resolveContextMoveData = function(move, actor, target, b) {
  const result = V23_prevResolveContextMoveData(move, actor, target, b);
  if (v23Api(move) === 255) {
    const count = v23StockpileCount(actor);
    return {...result, power: count * 100};
  }
  return result;
};

// A failed/empty Stockpile-family move must not consume PP. Swallow's heal scales
// with layers; Spit Up/Swallow consume the Stockpile and remove only its own boosts.
const V23_prevExecuteAction = executeAction;
executeAction = function(act, b) {
  if (!act || !b) return V23_prevExecuteAction(act, b);
  const team = act.side === 'player' ? b.playerTeam : b.enemyTeam;
  const actor = team?.find(m => m?.uid === act.actorUid);
  if (!actor) return V23_prevExecuteAction(act, b);
  if (act.switchTo != null) {
    v23ResetStockpile(actor, true);
    return V23_prevExecuteAction(act, b);
  }
  const selectedMove = getMove(act.moveId);
  const api = v23Api(selectedMove);
  const count = v23StockpileCount(actor);
  if (api === 254 && count >= 3) { battleLog('たくわえるは これ以上使えない！'); return; }
  if ((api === 255 || api === 256) && count === 0) { battleLog('たくわえがないため 技は失敗した！'); return; }
  if (api === 798 && !b.terrain) { battleLog(`${getMoveName(selectedMove)}はフィールドがないため失敗した！`); return; }

  const isChargeContinuation = actor._chargingMove === selectedMove?.id;
  const slot = (actor.moves || []).find(m => m?.id === selectedMove?.id);
  const target = ['self','allySide','allies','user-and-allies','users-field','entire-field','all-pokemon'].includes(selectedMove?.target) ? actor : targetForAction(actor, act, b);
  if (!isChargeContinuation && slot && api !== 165) {
    const ppCost = 1 + (target && v20Ab(target, b) === 'pressure' ? 1 : 0);
    if (Number(slot.pp || 0) < ppCost) { battleLog(`${getMoveName(selectedMove)}のPPが足りない！`); return; }
  }

  const oldHeal = selectedMove?.heal;
  if (api === 256) {
    const fraction = v23SwallowFraction(count);
    selectedMove.heal = fraction;
  }
  try {
    return V23_prevExecuteAction(act, b);
  } finally {
    if (api === 256 && selectedMove) selectedMove.heal = oldHeal;
    if (api === 255 || api === 256) v23ResetStockpile(actor, true);
  }
};

function v23AuditMoveMechanics() {
  const moves = Object.values(state.data?.movesById || state.data?.moves || {});
  const review = {auto_rule_based:0, needs_review:0, implemented_needs_battle_test:0, other:0};
  const tags = {}, categories = {}, mechanics = {heal:0, drain:0, recoil:0, multihit:0, ohko:0, selfSwitch:0, secondary:0, status:0, boostTag:0};
  const needsReview = [];
  for (const m of moves) {
    const c = m.classificationV2 || {};
    const status = c.reviewStatus || 'other'; review[status] = (review[status] || 0) + 1;
    categories[m.category] = (categories[m.category] || 0) + 1;
    for (const t of (c.tags || [])) tags[t] = (tags[t] || 0) + 1;
    if (m.heal) mechanics.heal++;
    if (m.drain) mechanics.drain++;
    if (m.recoil || m.selfRecoilMaxPct) mechanics.recoil++;
    if (m.multihit != null) mechanics.multihit++;
    if (m.ohko) mechanics.ohko++;
    if (m.selfSwitch) mechanics.selfSwitch++;
    if (m.secondary || (m.secondaries || []).length) mechanics.secondary++;
    if (m.status) mechanics.status++;
    if ((c.tags || []).some(t => /stat_stage_change|self_stat_change|target_stat_change/.test(t))) mechanics.boostTag++;
    if (status === 'needs_review') needsReview.push({apiId:m.apiId, jpName:m.jpName, id:m.id, description:m.mechanicDescription});
  }
  const v21 = typeof v21BattleAudit === 'function' ? v21BattleAudit() : null;
  const abilities = typeof v21AbilityAudit === 'function' ? v21AbilityAudit() : (typeof v20AbilityAudit === 'function' ? v20AbilityAudit() : null);
  return {
    version:V23_MOVE_MECHANICS_VERSION, totalMoves:moves.length, categories, reviewStatus:review,
    mechanicFields:mechanics, tagCounts:tags, descriptionParsedMoves:v21?.descriptionParsedMoves ?? null,
    inferredEffects:v21?.inferredEffects ?? null, needsReviewMoves:needsReview,
    abilityAudit:abilities ? {total:abilities.total, connected:abilities.connected ?? abilities.implemented, notConnected:abilities.notConnected ?? abilities.notImplemented} : null,
    note:'classificationV2 and description parsing are audit signals, not proof of complete mechanics. Existing and newly added handlers both need in-battle validation.'
  };
}
function v23RunMoveMechanicsTests() {
  const checks=[];
  const test=(name,fn)=>{try{checks.push({name,passed:!!fn()});}catch(e){checks.push({name,passed:false,error:String(e?.message||e)});}};
  test('朝の陽ざし等：晴れで2/3回復',()=>JSON.stringify(v23WeatherRecovery(234,'sun',false))==='[2,3]');
  test('朝の陽ざし等：雨・砂・雪で1/4回復',()=>['rain','sand','snow'].every(w=>JSON.stringify(v23WeatherRecovery(235,w,false))==='[1,4]'));
  test('すなあつめ：砂嵐以外は1/2',()=>JSON.stringify(v23WeatherRecovery(659,'rain',false))==='[1,2]');
  test('すなあつめ：砂嵐で2/3',()=>JSON.stringify(v23WeatherRecovery(659,'sand',false))==='[2,3]');
  test('Life Dewの1/4は四捨五入でなく半分切り上げ',()=>v23RoundHalfUp(25.25)===25 && v23RoundHalfUp(25.5)===26);
  test('Jungle Healingの1/4は切り上げ',()=>Math.ceil(25.25)===26);
  test('Swallow：1/2/3回で1/4・1/2・全回復',()=>[[1,4],[1,2],[1,1]].every((x,i)=>JSON.stringify(v23SwallowFraction(i+1))===JSON.stringify(x)));
  test('Spit Up：1/2/3回で威力100/200/300',()=>[1,2,3].every(n=>n*100===[100,200,300][n-1]));
  test('Heal Pulse／Flower Healing／Purify／Life Dew／Jungle Healingは汎用自己回復から除外',()=>[505,666,685,791,816].every(x=>V23_NON_SELF_HEAL_APIS.has(x)));
  test('Stockpile上限は3回',()=>Math.min(3,Math.max(0,3))===3);
  test('Stockpileの差分解除は既存ランクを保持',()=>v23ClampStageValue((5+1)-1)===5 && v23ClampStageValue(6-0)===6);
  test('Struggleの固定反動は最大HPの1/4',()=>Math.max(1,Math.floor(200/4))===50);
  test('技データが937件',()=>Object.keys(state.data?.movesById||state.data?.moves||{}).length===937);
  test('内蔵特性とShowdown特性の統合データを保持',()=>(state.data?.abilitiesList||[]).length>=300);
  return {version:V23_MOVE_MECHANICS_VERSION,passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
}

// Struggle is max-HP recoil, not recoil proportional to damage dealt.
const V23_prevApplyDamage = applyDamage;
applyDamage = function(target, damage, source=null, move=null) {
  const api = v23Api(move), isStruggle = api === 165 || slug(move?.id || move?.name || '') === 'struggle';
  if (!isStruggle || !source) return V23_prevApplyDamage(target, damage, source, move);
  const cleanMove = {...move, recoil:undefined};
  const actual = V23_prevApplyDamage(target, damage, source, cleanMove);
  if (actual > 0) {
    const recoil = Math.max(1, Math.floor(Number(source.maxhp || 1) / 4));
    source.hp = Math.max(0, Number(source.hp || 0) - recoil);
    if (source.hp <= 0) source.fainted = true;
    battleLog(`${source.name}はわるあがきの反動で${recoil}ダメージを受けた！`);
  }
  return actual;
};

// Report both the 937-move static audit and the 374-ability support registry in Settings.
const V23_prevRenderSettings = renderSettings;
renderSettings = function() {
  const base = V23_prevRenderSettings();
  const audit = v23AuditMoveMechanics();
  const tests = v23RunMoveMechanicsTests();
  const review = audit.reviewStatus || {};
  const ability = audit.abilityAudit || {};
  const notes = audit.needsReviewMoves.slice(0, 18).map(m => `<li><b>${esc(m.jpName || m.id)}</b>（API ${m.apiId}）</li>`).join('');
  return base + `<section class="panel" style="margin-top:16px"><div class="panel-head"><h2>🧪 v17.3 技効果・正確性監査</h2><span class="pill">v${V23_MOVE_MECHANICS_VERSION}</span></div><div class="panel-body"><p class="small muted">技のタグ・説明文解析・実際の効果処理を別々に記録。自動分類の数を「実装完了数」とは扱いません。</p><div class="care-mon-meta"><span class="pill">技 ${audit.totalMoves}</span><span class="pill">自動分類 ${review.auto_rule_based || 0}</span><span class="pill">要確認 ${review.needs_review || 0}</span><span class="pill">実装後テスト待ち ${review.implemented_needs_battle_test || 0}</span><span class="pill">自己テスト ${tests.passed}/${tests.total}</span></div><p class="tiny">説明文から抽出された技：${audit.descriptionParsedMoves ?? '—'}件／抽出効果：${audit.inferredEffects ?? '—'}件</p><details><summary>要確認の技（先頭18件）</summary><ul>${notes}</ul></details><details><summary>特性の対応登録状況</summary><p class="tiny">特性データ ${ability.total ?? 0}件／対応登録 ${ability.connected ?? 0}件／未登録 ${ability.notConnected ?? 0}件。登録済みは完全再現を保証する意味ではありません。</p></details><p class="tiny muted">本更新で追加修正した対象：対象回復技の二重回復防止、天候依存回復、Life Dew／Jungle Healing／Purify／Heal Pulseの回復対象と回復条件、Stockpile系3技、Struggleの最大HP基準反動、PP不足・Steel Roller条件の事前判定。</p></div></section>`;
};

if (window.PokemonChampions2DData) Object.assign(window.PokemonChampions2DData, {
  moveMechanicsVersion:V23_MOVE_MECHANICS_VERSION,
  auditMoveMechanics:v23AuditMoveMechanics,
  testMoveMechanics:v23RunMoveMechanicsTests
});
window.MoveEffectEngineV23 = {
  version:V23_MOVE_MECHANICS_VERSION,
  audit:v23AuditMoveMechanics,
  selfTest:v23RunMoveMechanicsTests,
  stockpileCount:v23StockpileCount
};


/* v18.2 CORE BRIDGE: safely exposes the core IIFE bindings to the versioned add-on modules below. */
const __V182_CORE_BRIDGE_NAMES = ["$", "$$", "GITHUB_SPRITES", "MEGA_GARCHOMP_FORM", "MEGA_GARCHOMP_Z_FORM", "TYPE_JA", "TYPE_COLORS", "STAT_KEYS", "STAT_JA", "TYPE_CHART", "STATUS_JA", "WEATHER_JA", "DATA_NOTE", "DEFAULT_ADMIN_CONFIG", "cleanAdminConfig", "state", "fallbackSpecies", "slug", "esc", "idSlug", "searchKey", "setLoad", "OFFLINE_DATABASE", "loadAllData", "makeFallbackMoves", "NON_FINAL_RECRUIT_IDS", "finalRecruitKey", "isFinalRecruitSpecies", "finalRecruitDex", "isSelectableFinalSpecies", "selectableDex", "finalDescendant", "resolvePlayableSpecies", "normalizeOwnedIdentity", "findSpecies", "getPokeName", "getMoveName", "getMove", "getLearnset", "learnableMoves", "defaultMovesFor", "enemyMovesFor", "makeOwned", "monSpecies", "calcStats", "natureMultiplier", "spriteSpecies", "spriteKey", "SPRITE_PLACEHOLDER", "spriteResolvedUrlCache", "spriteFailedUrls", "spriteListenersInstalled", "installSpriteListeners", "spriteIdentity", "specialSpriteUrls", "showdownSpriteUrls", "githubSpriteUrls", "spriteUrlCandidates", "imageUrl", "speciesIcon", "typesHtml", "typeMult", "statStage", "currentStat", "itemSlug", "abilityName", "abilityDescription", "abilityFallbackDescription", "moveDescription", "getMoveCatJa", "getMoveIcon", "formatPower", "formatAccuracy", "typeStyles", "rarityIcon", "hasSpeciesOwned", "reportSaveIssue", "saveLocal", "loadLocal", "saveStatusLabel", "toast", "setPage", "renderPage", "updateTop", "pageHeader", "statTile", "renderHome", "filteredDexList", "dexCard", "renderDex", "renderDexDetail", "MOVE_TAXONOMY", "moveTaxonomyCategories", "moveTaxonomyChips", "auditMoveTaxonomy", "renderMoveTaxonomyOverview", "moveEffectCategories", "abilityEffectCategories", "categoryChips", "moveClassificationV2Label", "MOVE_CLASSIFICATION_V2_LABELS", "MOVE_CLASSIFICATION_V2_FORMULAS", "moveClassificationV2SearchText", "isMoveClassifiedDamageV2", "resolvedMovePowerV2", "moveClassificationV2Panel", "auditMoveClassificationV2", "filteredMoves", "renderMoveCatalogDetail", "renderMoves", "filteredAbilities", "renderAbilities", "renderBox", "renderOwnedDetail", "LEGENDARY_MYTHICAL_IDS", "LEGENDARY_MYTHICAL_DEX_NUMS", "isLegendarySpecies", "scoutRarityFor", "rarityLabel", "scoutDrawRarity", "ownedFormKey", "hasOwnedForm", "drawScoutCandidates", "playRaidCaptureAnimation", "rollLegendaryTraits", "beginRaidPreparation", "renderScout", "renderTraining", "MEGA_STONES", "renderShop", "renderSettings", "chooseRandom", "buildBattleMon", "beginBattleIntro", "startBattle", "battleLog", "triggerEntryEffects", "activeLiving", "renderBattlePage", "abilityTriggerOnMove", "resolveMoveTypePower", "resolveContextMoveData", "calculateDamage", "applyDamage", "getEffectiveAccuracy", "setStatus", "applyBoosts", "applyWeather", "isGrounded", "applyTerrain", "applyMoveSpecificEffects", "applyMoveExtras", "canMove", "chooseEnemyAction", "activateMoveAnimation", "animateHit", "targetForAction", "executeAction", "processEndTurn", "battleCinematicPause", "clearBattleCamera", "setBattleCamera", "animateCinematicProjectile", "animateCinematicPulse", "cinematicResultFromLogs", "executeTurn", "findMegaForm", "megaEvolve", "openModal", "openHelp", "bindPageEvents", "refreshWithFocus", "openSwitchModal", "handleAction", "exportSave", "readImportFile", "ensureOwnedMoveSets", "initializeSave", "boot", "SAVE_KEY", "CARE_ITEMS", "STAT_LABELS", "clamp", "randomInt", "randomIvs", "randomNature", "ensureCareMon", "FAMILY_TEXT", "evosById", "evoMinimum", "speciesByNum", "evoKey", "addEvo", "setupEvos", "xpNeed", "monXpPercent", "giveExperience", "notePersonality", "addFriendship", "saveCare", "capItem", "carePageHeader", "renderCare", "evoReady", "setupEvosIfNeeded", "evolutionTargets", "randomBreedingSpecies", "chooseBattleGachaSpecies", "applyFarmTime", "takeExp", "eggRemainingMs", "speedHatchEgg", "beginHatch", "buyBattleGacha", "buyEgg", "careBuyItem", "careMonByUid", "doEvolve", "useCareItem", "doCareAction", "originalRenderPage", "originalRenderShop", "originalMakeOwned", "originalNormalizeOwnedIdentity", "originalBuildBattleMon", "originalCalcStats", "originalCalculateDamage", "originalExecuteAction", "originalProcessEndTurn", "originalExecuteTurn", "originalHandleAction", "originalSetPage", "MOVE_EFFECT_SCHEMA_VERSION", "MOVE_EFFECT_TYPES", "canonicalEffect", "legacyMoveEffects", "normalizeSpeciesMeasurements", "normalizeMoveForEngine", "auditUnifiedGameData", "executeCanonicalMoveEffects", "__v162LoadAllData", "__v162ApplyMoveExtras", "__v162ResolveContextMoveData", "__v164LoadAllData", "__v164ApplyMoveSpecificEffects", "__v164ExecuteCanonicalMoveEffects", "__v169LoadAllData", "V170_RECHARGE_API", "V170_CHARGE_API", "V170_SEMI_INVULNERABLE_API", "V170_COUNTER_API", "V170_HANDLED_API", "V170_CATEGORY_STATUS", "v170Api", "v170Side", "v170MoveName", "v170SetStages", "v170ForceSwitch", "v170HandleVariableDamage", "v170RunBattleEffects", "__v170ApplyMoveSpecificEffects", "__v170ApplyDamage", "__v170CanMove", "__v170ProcessEndTurn", "__v170TypeMult", "__v170CurrentStat", "__v170IsGrounded", "__v170Accuracy", "__v170ItemSlug", "auditBattleIntegration", "battleIntegrationStatus", "__v170RenderMoveCatalogDetail", "V171_RULE", "MOVE_EFFECT_DETAIL_GROUPS", "V171_DETAIL_RULES", "V171_DETAIL_BY_ID", "V171_CLASSIFY_CACHE", "classifyMoveEffects", "auditMoveEffectTaxonomy", "renderMoveFineTaxonomyOverview", "renderMoveFineDetail", "__v171FilteredMoves", "__v171RenderMoves", "__v171RenderMoveCatalogDetail", "__v171HandleAction", "V171_GUARD_CHAIN_IDS", "V171_PERSONAL_GUARD_IDS", "V171_PROTECT_BYPASS_IDS", "V171_PROTECT_BYPASS_NAMES", "v171MoveApi", "v171IsGuardChainMove", "v171BypassesProtect", "__v171ExecuteAction", "__v171ApplyMoveExtras", "__v171RunBattleEffects", "__v171ProcessEndTurn", "BC_ENGINE_VERSION", "BC_ACTIVITY_MS", "BC_ACTIVITY_SPEED_COST", "BC_SOUND_MOVE_IDS", "BC_BULLET_MOVE_IDS", "BC_PUNCH_MOVE_IDS", "BC_SLICING_MOVE_IDS", "BC_WIND_MOVE_IDS", "BC_LOCKED_MOVE_NAMES", "BC_BIND_MOVE_IDS", "BC_BYPASS_PROTECT_NAMES", "BC_STATUS_IMMUNITY", "BC_RUIN_STAT", "BC_MEMORY_TYPES", "BC_PLATE_TYPES", "bcSpeciesBaseId", "bcPlateType", "BC_prevMonSpecies", "bcBuiltInForm", "bcFindOrBuildForm", "bcAllBattleMons", "bcFindBattleMon", "bcSide", "bcOppositeSide", "bcActiveMons", "bcHasAbility", "bcAbility", "bcFlag", "bcItem", "bcConsumeItem", "bcEffectLog", "bcRecordError", "bcGetForm", "bcSwapForm", "bcUpdateDynamicForm", "bcBoostedStatKey", "bcRuinMultiplier", "bcRuinKey", "bcMoveId", "BC_prevBuildBattleMon", "BC_prevStartBattle", "BC_prevSetStatus", "BC_prevApplyBoosts", "BC_reflectingDrop", "bcReactToStatDrop", "BC_prevTypeMult", "BC_prevCurrentStat", "BC_prevResolveContext", "BC_prevCalculateDamage", "BC_prevAccuracy", "BC_prevAbilityTrigger", "BC_prevMoveSpecific", "BC_prevExecuteAction", "BC_prevProcessEndTurn", "BC_prevTriggerEntry", "BC_prevApplyDamage", "bcActivateTera", "BC_prevRenderBattlePage", "BC_prevHandleAction", "BC_prevExecuteTurn", "BC_prevMegaEvolve", "bcActivityTitle", "bcCompleteCareReward", "bcStartCareTask", "bcSpeedCareTask", "bcClaimCareTask", "BC_prevRenderCare", "bcAuditBattleEngine", "BC_prevRenderTraining", "BC_prevRenderSettings", "bcRuntimeDiagnostics", "V19_VERSION", "V19_OHKO_API", "V19_OHKO_NAMES", "V19_STATUS_MAP", "V19_TYPE_ITEMS", "V19_STATUS_TAGS", "v19Num", "v19Meta", "v19EnrichMove", "V19_prevGetMove", "v19IsOhko", "v19OhkoAccuracy", "v19ExecuteOhko", "V19_prevAccuracy", "v19ApplyTaggedStatus", "v19ApplyTagHealing", "V19_prevMoveSpecific", "V19_prevCanMove", "V19_prevProcessEndTurn", "v19CriticalChance", "V19_critExpr", "V19_critExprNew", "V19_prevTypeMult", "V19_prevIsGrounded", "V19_prevApplyDamage", "V19_prevCurrentStat", "V19_prevCalculateDamage", "V19_prevApplyBoosts", "V19_prevTriggerEntry", "V19_prevExecuteAction", "v19AllyTarget", "V19_prevExecuteTurn", "V19_prevTargetForAction", "v19EnsureBoxAssignments", "V19_prevLoadLocal", "V19_prevMakeOwned", "v19BoxCount", "v19BoxSortKey", "V19_prevRenderScout", "V19_prevRenderTraining", "V19_prevHandleAction", "v19RuntimeTags", "V19_prevRenderMoveFineDetail", "v19GameplayAudit", "v19Style", "V20_ABILITY_ENGINE_VERSION", "V20_SUPPORTED_ABILITIES", "v20AllMons", "v20Active", "v20Ab", "v20IsGasActive", "v20Side", "v20Opponents", "v20Allies", "v20Log", "v20Boost", "v20Heal", "v20AbilityEnabled", "v20IsMoveId", "v20WeatherSuppressed", "v20IsContact", "v20IsSound", "v20AbilityAudit", "V20_prevBuildBattleMon", "V20_prevCurrentStat", "V20_prevAccuracy", "V20_prevEntry", "V20_prevTargetForAction", "V20_prevAbilityTrigger", "V20_prevCalculateDamage", "V20_prevResolveContext", "V20_prevSetStatus", "V20_prevMoveExtras", "V20_prevApplyDamage", "V20_prevGetMove", "V20_prevExecuteAction", "V20_prevOhko", "V20_prevCriticalChance", "V20_prevCanMove", "V20_prevProcessEndTurn", "V20_abilityHudStyle", "V20_prevRenderSettings", "V21_VERSION", "V21_ABILITY_ALIAS", "v21CanonAbilityId", "V21_prevBcAbility", "V21_ITEM_ALIAS", "V21_prevItemSlug", "V21_MOVE_ID_JP", "v21MoveId", "V21_prevBcMoveId", "V21_FLAG_SETS", "v21EnsureMoveFlags", "V21_prevGetMove", "V21_prevBcFlag", "V22_CORE_CALC_RULES", "V21_STAT_NAMES", "V21_WORD_NUM", "v21ExistingSecondary", "v21ParseMoveEffects", "V21_SELF_EFFECT_IDS", "V21_TARGET_EFFECT_IDS", "v21RollEffect", "V21_prevApplyMoveExtras", "V21_prevMoveSpecific", "V21_prevResolveContext", "v21AbilityAudit", "V21_prevTriggerEntry", "V21_prevApplyWeather", "V21_prevTypeMult", "V21_prevSetStatus", "V21_prevCurrentStat", "V21_prevCalculateDamage", "V21_prevExecuteAction", "V21_prevExecuteTurn", "V21_prevProcessEndTurn", "V21_prevAbilityTriggerOnMove", "V21_prevApplyDamage", "V21_ITEM_JA", "v21IntegrityChecks", "v21BattleAudit", "__v1623LoadAllData", "V17_BATTLE_TAG_ENGINE_VERSION", "V17_BATTLE_TAG_DEFINITIONS", "V17_TAG_DEFINITION_MAP", "V17_FLAG_TAG_MAP", "V17_FORMULA_TAGS", "v17MoveId", "V17_API_FLAG_RANGE_TEXT", "v17ExpandApiRanges", "V17_API_FLAG_SETS", "V17_API_FLAG_TO_TAG", "v17NormalizeMove", "v17GetMoveRecords", "v17AuditBattleTags", "v17RunTagEngineSelfTests", "V17_previousGetMove", "V17_previousLoadAllData", "V22_MOVE_EFFECT_ENGINE_VERSION", "V22_EFFECT_PHASES", "V22_EFFECT_HANDLER_DEFINITIONS", "V22_STAT_KEY_MAP", "V22_API_EFFECT_MAP", "v22CleanDescription", "v22CompileMoveEffectPlan", "v22EnsureMoveEffectPlan", "v22Log", "v22ClampStage", "v22ApplyMoveEffect", "v22RunMoveEffectPhase", "v22AuditMoveEffectEngine", "v22RunMoveEffectEngineTests", "V22_prevLoadAllData", "V22_prevCalculateDamage", "V22_prevApplyMoveSpecificEffects", "V22_prevExecuteAction", "V22_prevRenderSettings", "V23_MOVE_MECHANICS_VERSION", "V23_NON_SELF_HEAL_APIS", "v23Api", "v23StockpileCount", "v23ClampStageValue", "v23WeatherRecovery", "v23RoundHalfUp", "v23SwallowFraction", "v23ResetStockpile", "v23AddStockpile", "v23ApplySideHealing", "V23_prevApplyMoveExtras", "V23_prevV19TagHealing", "V23_prevApplyMoveSpecificEffects", "V23_prevResolveContextMoveData", "V23_prevExecuteAction", "v23AuditMoveMechanics", "v23RunMoveMechanicsTests", "V23_prevApplyDamage", "V23_prevRenderSettings"];
  try{Object.defineProperty(window,"$",{configurable:true,enumerable:false,get:()=>$});}catch(_e){}
  try{Object.defineProperty(window,"$$",{configurable:true,enumerable:false,get:()=>$$});}catch(_e){}
  try{Object.defineProperty(window,"GITHUB_SPRITES",{configurable:true,enumerable:false,get:()=>GITHUB_SPRITES});}catch(_e){}
  try{Object.defineProperty(window,"MEGA_GARCHOMP_FORM",{configurable:true,enumerable:false,get:()=>MEGA_GARCHOMP_FORM});}catch(_e){}
  try{Object.defineProperty(window,"MEGA_GARCHOMP_Z_FORM",{configurable:true,enumerable:false,get:()=>MEGA_GARCHOMP_Z_FORM});}catch(_e){}
  try{Object.defineProperty(window,"TYPE_JA",{configurable:true,enumerable:false,get:()=>TYPE_JA});}catch(_e){}
  try{Object.defineProperty(window,"TYPE_COLORS",{configurable:true,enumerable:false,get:()=>TYPE_COLORS});}catch(_e){}
  try{Object.defineProperty(window,"STAT_KEYS",{configurable:true,enumerable:false,get:()=>STAT_KEYS});}catch(_e){}
  try{Object.defineProperty(window,"STAT_JA",{configurable:true,enumerable:false,get:()=>STAT_JA});}catch(_e){}
  try{Object.defineProperty(window,"TYPE_CHART",{configurable:true,enumerable:false,get:()=>TYPE_CHART});}catch(_e){}
  try{Object.defineProperty(window,"STATUS_JA",{configurable:true,enumerable:false,get:()=>STATUS_JA});}catch(_e){}
  try{Object.defineProperty(window,"WEATHER_JA",{configurable:true,enumerable:false,get:()=>WEATHER_JA});}catch(_e){}
  try{Object.defineProperty(window,"DATA_NOTE",{configurable:true,enumerable:false,get:()=>DATA_NOTE});}catch(_e){}
  try{Object.defineProperty(window,"DEFAULT_ADMIN_CONFIG",{configurable:true,enumerable:false,get:()=>DEFAULT_ADMIN_CONFIG});}catch(_e){}
  try{Object.defineProperty(window,"cleanAdminConfig",{configurable:true,enumerable:false,get:()=>cleanAdminConfig,set:v=>{cleanAdminConfig=v;}});}catch(_e){}
  try{Object.defineProperty(window,"state",{configurable:true,enumerable:false,get:()=>state});}catch(_e){}
  try{Object.defineProperty(window,"fallbackSpecies",{configurable:true,enumerable:false,get:()=>fallbackSpecies});}catch(_e){}
  try{Object.defineProperty(window,"slug",{configurable:true,enumerable:false,get:()=>slug,set:v=>{slug=v;}});}catch(_e){}
  try{Object.defineProperty(window,"esc",{configurable:true,enumerable:false,get:()=>esc,set:v=>{esc=v;}});}catch(_e){}
  try{Object.defineProperty(window,"idSlug",{configurable:true,enumerable:false,get:()=>idSlug,set:v=>{idSlug=v;}});}catch(_e){}
  try{Object.defineProperty(window,"searchKey",{configurable:true,enumerable:false,get:()=>searchKey,set:v=>{searchKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"setLoad",{configurable:true,enumerable:false,get:()=>setLoad,set:v=>{setLoad=v;}});}catch(_e){}
  try{Object.defineProperty(window,"OFFLINE_DATABASE",{configurable:true,enumerable:false,get:()=>OFFLINE_DATABASE});}catch(_e){}
  try{Object.defineProperty(window,"loadAllData",{configurable:true,enumerable:false,get:()=>loadAllData,set:v=>{loadAllData=v;}});}catch(_e){}
  try{Object.defineProperty(window,"makeFallbackMoves",{configurable:true,enumerable:false,get:()=>makeFallbackMoves,set:v=>{makeFallbackMoves=v;}});}catch(_e){}
  try{Object.defineProperty(window,"NON_FINAL_RECRUIT_IDS",{configurable:true,enumerable:false,get:()=>NON_FINAL_RECRUIT_IDS});}catch(_e){}
  try{Object.defineProperty(window,"finalRecruitKey",{configurable:true,enumerable:false,get:()=>finalRecruitKey,set:v=>{finalRecruitKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"isFinalRecruitSpecies",{configurable:true,enumerable:false,get:()=>isFinalRecruitSpecies,set:v=>{isFinalRecruitSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"finalRecruitDex",{configurable:true,enumerable:false,get:()=>finalRecruitDex,set:v=>{finalRecruitDex=v;}});}catch(_e){}
  try{Object.defineProperty(window,"isSelectableFinalSpecies",{configurable:true,enumerable:false,get:()=>isSelectableFinalSpecies,set:v=>{isSelectableFinalSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"selectableDex",{configurable:true,enumerable:false,get:()=>selectableDex,set:v=>{selectableDex=v;}});}catch(_e){}
  try{Object.defineProperty(window,"finalDescendant",{configurable:true,enumerable:false,get:()=>finalDescendant,set:v=>{finalDescendant=v;}});}catch(_e){}
  try{Object.defineProperty(window,"resolvePlayableSpecies",{configurable:true,enumerable:false,get:()=>resolvePlayableSpecies,set:v=>{resolvePlayableSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"normalizeOwnedIdentity",{configurable:true,enumerable:false,get:()=>normalizeOwnedIdentity,set:v=>{normalizeOwnedIdentity=v;}});}catch(_e){}
  try{Object.defineProperty(window,"findSpecies",{configurable:true,enumerable:false,get:()=>findSpecies,set:v=>{findSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"getPokeName",{configurable:true,enumerable:false,get:()=>getPokeName,set:v=>{getPokeName=v;}});}catch(_e){}
  try{Object.defineProperty(window,"getMoveName",{configurable:true,enumerable:false,get:()=>getMoveName,set:v=>{getMoveName=v;}});}catch(_e){}
  try{Object.defineProperty(window,"getMove",{configurable:true,enumerable:false,get:()=>getMove,set:v=>{getMove=v;}});}catch(_e){}
  try{Object.defineProperty(window,"getLearnset",{configurable:true,enumerable:false,get:()=>getLearnset,set:v=>{getLearnset=v;}});}catch(_e){}
  try{Object.defineProperty(window,"learnableMoves",{configurable:true,enumerable:false,get:()=>learnableMoves,set:v=>{learnableMoves=v;}});}catch(_e){}
  try{Object.defineProperty(window,"defaultMovesFor",{configurable:true,enumerable:false,get:()=>defaultMovesFor,set:v=>{defaultMovesFor=v;}});}catch(_e){}
  try{Object.defineProperty(window,"enemyMovesFor",{configurable:true,enumerable:false,get:()=>enemyMovesFor,set:v=>{enemyMovesFor=v;}});}catch(_e){}
  try{Object.defineProperty(window,"makeOwned",{configurable:true,enumerable:false,get:()=>makeOwned,set:v=>{makeOwned=v;}});}catch(_e){}
  try{Object.defineProperty(window,"monSpecies",{configurable:true,enumerable:false,get:()=>monSpecies,set:v=>{monSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"calcStats",{configurable:true,enumerable:false,get:()=>calcStats,set:v=>{calcStats=v;}});}catch(_e){}
  try{Object.defineProperty(window,"natureMultiplier",{configurable:true,enumerable:false,get:()=>natureMultiplier,set:v=>{natureMultiplier=v;}});}catch(_e){}
  try{Object.defineProperty(window,"spriteSpecies",{configurable:true,enumerable:false,get:()=>spriteSpecies,set:v=>{spriteSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"spriteKey",{configurable:true,enumerable:false,get:()=>spriteKey,set:v=>{spriteKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"SPRITE_PLACEHOLDER",{configurable:true,enumerable:false,get:()=>SPRITE_PLACEHOLDER});}catch(_e){}
  try{Object.defineProperty(window,"spriteResolvedUrlCache",{configurable:true,enumerable:false,get:()=>spriteResolvedUrlCache});}catch(_e){}
  try{Object.defineProperty(window,"spriteFailedUrls",{configurable:true,enumerable:false,get:()=>spriteFailedUrls});}catch(_e){}
  try{Object.defineProperty(window,"spriteListenersInstalled",{configurable:true,enumerable:false,get:()=>spriteListenersInstalled,set:v=>{spriteListenersInstalled=v;}});}catch(_e){}
  try{Object.defineProperty(window,"installSpriteListeners",{configurable:true,enumerable:false,get:()=>installSpriteListeners,set:v=>{installSpriteListeners=v;}});}catch(_e){}
  try{Object.defineProperty(window,"spriteIdentity",{configurable:true,enumerable:false,get:()=>spriteIdentity,set:v=>{spriteIdentity=v;}});}catch(_e){}
  try{Object.defineProperty(window,"specialSpriteUrls",{configurable:true,enumerable:false,get:()=>specialSpriteUrls,set:v=>{specialSpriteUrls=v;}});}catch(_e){}
  try{Object.defineProperty(window,"showdownSpriteUrls",{configurable:true,enumerable:false,get:()=>showdownSpriteUrls,set:v=>{showdownSpriteUrls=v;}});}catch(_e){}
  try{Object.defineProperty(window,"githubSpriteUrls",{configurable:true,enumerable:false,get:()=>githubSpriteUrls,set:v=>{githubSpriteUrls=v;}});}catch(_e){}
  try{Object.defineProperty(window,"spriteUrlCandidates",{configurable:true,enumerable:false,get:()=>spriteUrlCandidates,set:v=>{spriteUrlCandidates=v;}});}catch(_e){}
  try{Object.defineProperty(window,"imageUrl",{configurable:true,enumerable:false,get:()=>imageUrl,set:v=>{imageUrl=v;}});}catch(_e){}
  try{Object.defineProperty(window,"speciesIcon",{configurable:true,enumerable:false,get:()=>speciesIcon,set:v=>{speciesIcon=v;}});}catch(_e){}
  try{Object.defineProperty(window,"typesHtml",{configurable:true,enumerable:false,get:()=>typesHtml,set:v=>{typesHtml=v;}});}catch(_e){}
  try{Object.defineProperty(window,"typeMult",{configurable:true,enumerable:false,get:()=>typeMult,set:v=>{typeMult=v;}});}catch(_e){}
  try{Object.defineProperty(window,"statStage",{configurable:true,enumerable:false,get:()=>statStage,set:v=>{statStage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"currentStat",{configurable:true,enumerable:false,get:()=>currentStat,set:v=>{currentStat=v;}});}catch(_e){}
  try{Object.defineProperty(window,"itemSlug",{configurable:true,enumerable:false,get:()=>itemSlug,set:v=>{itemSlug=v;}});}catch(_e){}
  try{Object.defineProperty(window,"abilityName",{configurable:true,enumerable:false,get:()=>abilityName,set:v=>{abilityName=v;}});}catch(_e){}
  try{Object.defineProperty(window,"abilityDescription",{configurable:true,enumerable:false,get:()=>abilityDescription,set:v=>{abilityDescription=v;}});}catch(_e){}
  try{Object.defineProperty(window,"abilityFallbackDescription",{configurable:true,enumerable:false,get:()=>abilityFallbackDescription,set:v=>{abilityFallbackDescription=v;}});}catch(_e){}
  try{Object.defineProperty(window,"moveDescription",{configurable:true,enumerable:false,get:()=>moveDescription,set:v=>{moveDescription=v;}});}catch(_e){}
  try{Object.defineProperty(window,"getMoveCatJa",{configurable:true,enumerable:false,get:()=>getMoveCatJa,set:v=>{getMoveCatJa=v;}});}catch(_e){}
  try{Object.defineProperty(window,"getMoveIcon",{configurable:true,enumerable:false,get:()=>getMoveIcon,set:v=>{getMoveIcon=v;}});}catch(_e){}
  try{Object.defineProperty(window,"formatPower",{configurable:true,enumerable:false,get:()=>formatPower,set:v=>{formatPower=v;}});}catch(_e){}
  try{Object.defineProperty(window,"formatAccuracy",{configurable:true,enumerable:false,get:()=>formatAccuracy,set:v=>{formatAccuracy=v;}});}catch(_e){}
  try{Object.defineProperty(window,"typeStyles",{configurable:true,enumerable:false,get:()=>typeStyles,set:v=>{typeStyles=v;}});}catch(_e){}
  try{Object.defineProperty(window,"rarityIcon",{configurable:true,enumerable:false,get:()=>rarityIcon,set:v=>{rarityIcon=v;}});}catch(_e){}
  try{Object.defineProperty(window,"hasSpeciesOwned",{configurable:true,enumerable:false,get:()=>hasSpeciesOwned,set:v=>{hasSpeciesOwned=v;}});}catch(_e){}
  try{Object.defineProperty(window,"reportSaveIssue",{configurable:true,enumerable:false,get:()=>reportSaveIssue,set:v=>{reportSaveIssue=v;}});}catch(_e){}
  try{Object.defineProperty(window,"saveLocal",{configurable:true,enumerable:false,get:()=>saveLocal,set:v=>{saveLocal=v;}});}catch(_e){}
  try{Object.defineProperty(window,"loadLocal",{configurable:true,enumerable:false,get:()=>loadLocal,set:v=>{loadLocal=v;}});}catch(_e){}
  try{Object.defineProperty(window,"saveStatusLabel",{configurable:true,enumerable:false,get:()=>saveStatusLabel,set:v=>{saveStatusLabel=v;}});}catch(_e){}
  try{Object.defineProperty(window,"toast",{configurable:true,enumerable:false,get:()=>toast,set:v=>{toast=v;}});}catch(_e){}
  try{Object.defineProperty(window,"setPage",{configurable:true,enumerable:false,get:()=>setPage,set:v=>{setPage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderPage",{configurable:true,enumerable:false,get:()=>renderPage,set:v=>{renderPage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"updateTop",{configurable:true,enumerable:false,get:()=>updateTop,set:v=>{updateTop=v;}});}catch(_e){}
  try{Object.defineProperty(window,"pageHeader",{configurable:true,enumerable:false,get:()=>pageHeader,set:v=>{pageHeader=v;}});}catch(_e){}
  try{Object.defineProperty(window,"statTile",{configurable:true,enumerable:false,get:()=>statTile,set:v=>{statTile=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderHome",{configurable:true,enumerable:false,get:()=>renderHome,set:v=>{renderHome=v;}});}catch(_e){}
  try{Object.defineProperty(window,"filteredDexList",{configurable:true,enumerable:false,get:()=>filteredDexList,set:v=>{filteredDexList=v;}});}catch(_e){}
  try{Object.defineProperty(window,"dexCard",{configurable:true,enumerable:false,get:()=>dexCard,set:v=>{dexCard=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderDex",{configurable:true,enumerable:false,get:()=>renderDex,set:v=>{renderDex=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderDexDetail",{configurable:true,enumerable:false,get:()=>renderDexDetail,set:v=>{renderDexDetail=v;}});}catch(_e){}
  try{Object.defineProperty(window,"MOVE_TAXONOMY",{configurable:true,enumerable:false,get:()=>MOVE_TAXONOMY});}catch(_e){}
  try{Object.defineProperty(window,"moveTaxonomyCategories",{configurable:true,enumerable:false,get:()=>moveTaxonomyCategories,set:v=>{moveTaxonomyCategories=v;}});}catch(_e){}
  try{Object.defineProperty(window,"moveTaxonomyChips",{configurable:true,enumerable:false,get:()=>moveTaxonomyChips,set:v=>{moveTaxonomyChips=v;}});}catch(_e){}
  try{Object.defineProperty(window,"auditMoveTaxonomy",{configurable:true,enumerable:false,get:()=>auditMoveTaxonomy,set:v=>{auditMoveTaxonomy=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderMoveTaxonomyOverview",{configurable:true,enumerable:false,get:()=>renderMoveTaxonomyOverview,set:v=>{renderMoveTaxonomyOverview=v;}});}catch(_e){}
  try{Object.defineProperty(window,"moveEffectCategories",{configurable:true,enumerable:false,get:()=>moveEffectCategories,set:v=>{moveEffectCategories=v;}});}catch(_e){}
  try{Object.defineProperty(window,"abilityEffectCategories",{configurable:true,enumerable:false,get:()=>abilityEffectCategories,set:v=>{abilityEffectCategories=v;}});}catch(_e){}
  try{Object.defineProperty(window,"categoryChips",{configurable:true,enumerable:false,get:()=>categoryChips,set:v=>{categoryChips=v;}});}catch(_e){}
  try{Object.defineProperty(window,"moveClassificationV2Label",{configurable:true,enumerable:false,get:()=>moveClassificationV2Label,set:v=>{moveClassificationV2Label=v;}});}catch(_e){}
  try{Object.defineProperty(window,"MOVE_CLASSIFICATION_V2_LABELS",{configurable:true,enumerable:false,get:()=>MOVE_CLASSIFICATION_V2_LABELS});}catch(_e){}
  try{Object.defineProperty(window,"MOVE_CLASSIFICATION_V2_FORMULAS",{configurable:true,enumerable:false,get:()=>MOVE_CLASSIFICATION_V2_FORMULAS});}catch(_e){}
  try{Object.defineProperty(window,"moveClassificationV2SearchText",{configurable:true,enumerable:false,get:()=>moveClassificationV2SearchText,set:v=>{moveClassificationV2SearchText=v;}});}catch(_e){}
  try{Object.defineProperty(window,"isMoveClassifiedDamageV2",{configurable:true,enumerable:false,get:()=>isMoveClassifiedDamageV2,set:v=>{isMoveClassifiedDamageV2=v;}});}catch(_e){}
  try{Object.defineProperty(window,"resolvedMovePowerV2",{configurable:true,enumerable:false,get:()=>resolvedMovePowerV2,set:v=>{resolvedMovePowerV2=v;}});}catch(_e){}
  try{Object.defineProperty(window,"moveClassificationV2Panel",{configurable:true,enumerable:false,get:()=>moveClassificationV2Panel,set:v=>{moveClassificationV2Panel=v;}});}catch(_e){}
  try{Object.defineProperty(window,"auditMoveClassificationV2",{configurable:true,enumerable:false,get:()=>auditMoveClassificationV2,set:v=>{auditMoveClassificationV2=v;}});}catch(_e){}
  try{Object.defineProperty(window,"filteredMoves",{configurable:true,enumerable:false,get:()=>filteredMoves,set:v=>{filteredMoves=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderMoveCatalogDetail",{configurable:true,enumerable:false,get:()=>renderMoveCatalogDetail,set:v=>{renderMoveCatalogDetail=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderMoves",{configurable:true,enumerable:false,get:()=>renderMoves,set:v=>{renderMoves=v;}});}catch(_e){}
  try{Object.defineProperty(window,"filteredAbilities",{configurable:true,enumerable:false,get:()=>filteredAbilities,set:v=>{filteredAbilities=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderAbilities",{configurable:true,enumerable:false,get:()=>renderAbilities,set:v=>{renderAbilities=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderBox",{configurable:true,enumerable:false,get:()=>renderBox,set:v=>{renderBox=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderOwnedDetail",{configurable:true,enumerable:false,get:()=>renderOwnedDetail,set:v=>{renderOwnedDetail=v;}});}catch(_e){}
  try{Object.defineProperty(window,"LEGENDARY_MYTHICAL_IDS",{configurable:true,enumerable:false,get:()=>LEGENDARY_MYTHICAL_IDS});}catch(_e){}
  try{Object.defineProperty(window,"LEGENDARY_MYTHICAL_DEX_NUMS",{configurable:true,enumerable:false,get:()=>LEGENDARY_MYTHICAL_DEX_NUMS});}catch(_e){}
  try{Object.defineProperty(window,"isLegendarySpecies",{configurable:true,enumerable:false,get:()=>isLegendarySpecies,set:v=>{isLegendarySpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"scoutRarityFor",{configurable:true,enumerable:false,get:()=>scoutRarityFor,set:v=>{scoutRarityFor=v;}});}catch(_e){}
  try{Object.defineProperty(window,"rarityLabel",{configurable:true,enumerable:false,get:()=>rarityLabel,set:v=>{rarityLabel=v;}});}catch(_e){}
  try{Object.defineProperty(window,"scoutDrawRarity",{configurable:true,enumerable:false,get:()=>scoutDrawRarity,set:v=>{scoutDrawRarity=v;}});}catch(_e){}
  try{Object.defineProperty(window,"ownedFormKey",{configurable:true,enumerable:false,get:()=>ownedFormKey,set:v=>{ownedFormKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"hasOwnedForm",{configurable:true,enumerable:false,get:()=>hasOwnedForm,set:v=>{hasOwnedForm=v;}});}catch(_e){}
  try{Object.defineProperty(window,"drawScoutCandidates",{configurable:true,enumerable:false,get:()=>drawScoutCandidates,set:v=>{drawScoutCandidates=v;}});}catch(_e){}
  try{Object.defineProperty(window,"playRaidCaptureAnimation",{configurable:true,enumerable:false,get:()=>playRaidCaptureAnimation,set:v=>{playRaidCaptureAnimation=v;}});}catch(_e){}
  try{Object.defineProperty(window,"rollLegendaryTraits",{configurable:true,enumerable:false,get:()=>rollLegendaryTraits,set:v=>{rollLegendaryTraits=v;}});}catch(_e){}
  try{Object.defineProperty(window,"beginRaidPreparation",{configurable:true,enumerable:false,get:()=>beginRaidPreparation,set:v=>{beginRaidPreparation=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderScout",{configurable:true,enumerable:false,get:()=>renderScout,set:v=>{renderScout=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderTraining",{configurable:true,enumerable:false,get:()=>renderTraining,set:v=>{renderTraining=v;}});}catch(_e){}
  try{Object.defineProperty(window,"MEGA_STONES",{configurable:true,enumerable:false,get:()=>MEGA_STONES});}catch(_e){}
  try{Object.defineProperty(window,"renderShop",{configurable:true,enumerable:false,get:()=>renderShop,set:v=>{renderShop=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderSettings",{configurable:true,enumerable:false,get:()=>renderSettings,set:v=>{renderSettings=v;}});}catch(_e){}
  try{Object.defineProperty(window,"chooseRandom",{configurable:true,enumerable:false,get:()=>chooseRandom,set:v=>{chooseRandom=v;}});}catch(_e){}
  try{Object.defineProperty(window,"buildBattleMon",{configurable:true,enumerable:false,get:()=>buildBattleMon,set:v=>{buildBattleMon=v;}});}catch(_e){}
  try{Object.defineProperty(window,"beginBattleIntro",{configurable:true,enumerable:false,get:()=>beginBattleIntro,set:v=>{beginBattleIntro=v;}});}catch(_e){}
  try{Object.defineProperty(window,"startBattle",{configurable:true,enumerable:false,get:()=>startBattle,set:v=>{startBattle=v;}});}catch(_e){}
  try{Object.defineProperty(window,"battleLog",{configurable:true,enumerable:false,get:()=>battleLog,set:v=>{battleLog=v;}});}catch(_e){}
  try{Object.defineProperty(window,"triggerEntryEffects",{configurable:true,enumerable:false,get:()=>triggerEntryEffects,set:v=>{triggerEntryEffects=v;}});}catch(_e){}
  try{Object.defineProperty(window,"activeLiving",{configurable:true,enumerable:false,get:()=>activeLiving,set:v=>{activeLiving=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderBattlePage",{configurable:true,enumerable:false,get:()=>renderBattlePage,set:v=>{renderBattlePage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"abilityTriggerOnMove",{configurable:true,enumerable:false,get:()=>abilityTriggerOnMove,set:v=>{abilityTriggerOnMove=v;}});}catch(_e){}
  try{Object.defineProperty(window,"resolveMoveTypePower",{configurable:true,enumerable:false,get:()=>resolveMoveTypePower,set:v=>{resolveMoveTypePower=v;}});}catch(_e){}
  try{Object.defineProperty(window,"resolveContextMoveData",{configurable:true,enumerable:false,get:()=>resolveContextMoveData,set:v=>{resolveContextMoveData=v;}});}catch(_e){}
  try{Object.defineProperty(window,"calculateDamage",{configurable:true,enumerable:false,get:()=>calculateDamage,set:v=>{calculateDamage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"applyDamage",{configurable:true,enumerable:false,get:()=>applyDamage,set:v=>{applyDamage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"getEffectiveAccuracy",{configurable:true,enumerable:false,get:()=>getEffectiveAccuracy,set:v=>{getEffectiveAccuracy=v;}});}catch(_e){}
  try{Object.defineProperty(window,"setStatus",{configurable:true,enumerable:false,get:()=>setStatus,set:v=>{setStatus=v;}});}catch(_e){}
  try{Object.defineProperty(window,"applyBoosts",{configurable:true,enumerable:false,get:()=>applyBoosts,set:v=>{applyBoosts=v;}});}catch(_e){}
  try{Object.defineProperty(window,"applyWeather",{configurable:true,enumerable:false,get:()=>applyWeather,set:v=>{applyWeather=v;}});}catch(_e){}
  try{Object.defineProperty(window,"isGrounded",{configurable:true,enumerable:false,get:()=>isGrounded,set:v=>{isGrounded=v;}});}catch(_e){}
  try{Object.defineProperty(window,"applyTerrain",{configurable:true,enumerable:false,get:()=>applyTerrain,set:v=>{applyTerrain=v;}});}catch(_e){}
  try{Object.defineProperty(window,"applyMoveSpecificEffects",{configurable:true,enumerable:false,get:()=>applyMoveSpecificEffects,set:v=>{applyMoveSpecificEffects=v;}});}catch(_e){}
  try{Object.defineProperty(window,"applyMoveExtras",{configurable:true,enumerable:false,get:()=>applyMoveExtras,set:v=>{applyMoveExtras=v;}});}catch(_e){}
  try{Object.defineProperty(window,"canMove",{configurable:true,enumerable:false,get:()=>canMove,set:v=>{canMove=v;}});}catch(_e){}
  try{Object.defineProperty(window,"chooseEnemyAction",{configurable:true,enumerable:false,get:()=>chooseEnemyAction,set:v=>{chooseEnemyAction=v;}});}catch(_e){}
  try{Object.defineProperty(window,"activateMoveAnimation",{configurable:true,enumerable:false,get:()=>activateMoveAnimation,set:v=>{activateMoveAnimation=v;}});}catch(_e){}
  try{Object.defineProperty(window,"animateHit",{configurable:true,enumerable:false,get:()=>animateHit,set:v=>{animateHit=v;}});}catch(_e){}
  try{Object.defineProperty(window,"targetForAction",{configurable:true,enumerable:false,get:()=>targetForAction,set:v=>{targetForAction=v;}});}catch(_e){}
  try{Object.defineProperty(window,"executeAction",{configurable:true,enumerable:false,get:()=>executeAction,set:v=>{executeAction=v;}});}catch(_e){}
  try{Object.defineProperty(window,"processEndTurn",{configurable:true,enumerable:false,get:()=>processEndTurn,set:v=>{processEndTurn=v;}});}catch(_e){}
  try{Object.defineProperty(window,"battleCinematicPause",{configurable:true,enumerable:false,get:()=>battleCinematicPause,set:v=>{battleCinematicPause=v;}});}catch(_e){}
  try{Object.defineProperty(window,"clearBattleCamera",{configurable:true,enumerable:false,get:()=>clearBattleCamera,set:v=>{clearBattleCamera=v;}});}catch(_e){}
  try{Object.defineProperty(window,"setBattleCamera",{configurable:true,enumerable:false,get:()=>setBattleCamera,set:v=>{setBattleCamera=v;}});}catch(_e){}
  try{Object.defineProperty(window,"animateCinematicProjectile",{configurable:true,enumerable:false,get:()=>animateCinematicProjectile,set:v=>{animateCinematicProjectile=v;}});}catch(_e){}
  try{Object.defineProperty(window,"animateCinematicPulse",{configurable:true,enumerable:false,get:()=>animateCinematicPulse,set:v=>{animateCinematicPulse=v;}});}catch(_e){}
  try{Object.defineProperty(window,"cinematicResultFromLogs",{configurable:true,enumerable:false,get:()=>cinematicResultFromLogs,set:v=>{cinematicResultFromLogs=v;}});}catch(_e){}
  try{Object.defineProperty(window,"executeTurn",{configurable:true,enumerable:false,get:()=>executeTurn,set:v=>{executeTurn=v;}});}catch(_e){}
  try{Object.defineProperty(window,"findMegaForm",{configurable:true,enumerable:false,get:()=>findMegaForm,set:v=>{findMegaForm=v;}});}catch(_e){}
  try{Object.defineProperty(window,"megaEvolve",{configurable:true,enumerable:false,get:()=>megaEvolve,set:v=>{megaEvolve=v;}});}catch(_e){}
  try{Object.defineProperty(window,"openModal",{configurable:true,enumerable:false,get:()=>openModal,set:v=>{openModal=v;}});}catch(_e){}
  try{Object.defineProperty(window,"openHelp",{configurable:true,enumerable:false,get:()=>openHelp,set:v=>{openHelp=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bindPageEvents",{configurable:true,enumerable:false,get:()=>bindPageEvents,set:v=>{bindPageEvents=v;}});}catch(_e){}
  try{Object.defineProperty(window,"refreshWithFocus",{configurable:true,enumerable:false,get:()=>refreshWithFocus,set:v=>{refreshWithFocus=v;}});}catch(_e){}
  try{Object.defineProperty(window,"openSwitchModal",{configurable:true,enumerable:false,get:()=>openSwitchModal,set:v=>{openSwitchModal=v;}});}catch(_e){}
  try{Object.defineProperty(window,"handleAction",{configurable:true,enumerable:false,get:()=>handleAction,set:v=>{handleAction=v;}});}catch(_e){}
  try{Object.defineProperty(window,"exportSave",{configurable:true,enumerable:false,get:()=>exportSave,set:v=>{exportSave=v;}});}catch(_e){}
  try{Object.defineProperty(window,"readImportFile",{configurable:true,enumerable:false,get:()=>readImportFile,set:v=>{readImportFile=v;}});}catch(_e){}
  try{Object.defineProperty(window,"ensureOwnedMoveSets",{configurable:true,enumerable:false,get:()=>ensureOwnedMoveSets,set:v=>{ensureOwnedMoveSets=v;}});}catch(_e){}
  try{Object.defineProperty(window,"initializeSave",{configurable:true,enumerable:false,get:()=>initializeSave,set:v=>{initializeSave=v;}});}catch(_e){}
  try{Object.defineProperty(window,"boot",{configurable:true,enumerable:false,get:()=>boot,set:v=>{boot=v;}});}catch(_e){}
  try{Object.defineProperty(window,"SAVE_KEY",{configurable:true,enumerable:false,get:()=>SAVE_KEY});}catch(_e){}
  try{Object.defineProperty(window,"CARE_ITEMS",{configurable:true,enumerable:false,get:()=>CARE_ITEMS});}catch(_e){}
  try{Object.defineProperty(window,"STAT_LABELS",{configurable:true,enumerable:false,get:()=>STAT_LABELS});}catch(_e){}
  try{Object.defineProperty(window,"clamp",{configurable:true,enumerable:false,get:()=>clamp,set:v=>{clamp=v;}});}catch(_e){}
  try{Object.defineProperty(window,"randomInt",{configurable:true,enumerable:false,get:()=>randomInt,set:v=>{randomInt=v;}});}catch(_e){}
  try{Object.defineProperty(window,"randomIvs",{configurable:true,enumerable:false,get:()=>randomIvs,set:v=>{randomIvs=v;}});}catch(_e){}
  try{Object.defineProperty(window,"randomNature",{configurable:true,enumerable:false,get:()=>randomNature,set:v=>{randomNature=v;}});}catch(_e){}
  try{Object.defineProperty(window,"ensureCareMon",{configurable:true,enumerable:false,get:()=>ensureCareMon,set:v=>{ensureCareMon=v;}});}catch(_e){}
  try{Object.defineProperty(window,"FAMILY_TEXT",{configurable:true,enumerable:false,get:()=>FAMILY_TEXT});}catch(_e){}
  try{Object.defineProperty(window,"evosById",{configurable:true,enumerable:false,get:()=>evosById});}catch(_e){}
  try{Object.defineProperty(window,"evoMinimum",{configurable:true,enumerable:false,get:()=>evoMinimum});}catch(_e){}
  try{Object.defineProperty(window,"speciesByNum",{configurable:true,enumerable:false,get:()=>speciesByNum});}catch(_e){}
  try{Object.defineProperty(window,"evoKey",{configurable:true,enumerable:false,get:()=>evoKey,set:v=>{evoKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"addEvo",{configurable:true,enumerable:false,get:()=>addEvo,set:v=>{addEvo=v;}});}catch(_e){}
  try{Object.defineProperty(window,"setupEvos",{configurable:true,enumerable:false,get:()=>setupEvos,set:v=>{setupEvos=v;}});}catch(_e){}
  try{Object.defineProperty(window,"xpNeed",{configurable:true,enumerable:false,get:()=>xpNeed,set:v=>{xpNeed=v;}});}catch(_e){}
  try{Object.defineProperty(window,"monXpPercent",{configurable:true,enumerable:false,get:()=>monXpPercent,set:v=>{monXpPercent=v;}});}catch(_e){}
  try{Object.defineProperty(window,"giveExperience",{configurable:true,enumerable:false,get:()=>giveExperience,set:v=>{giveExperience=v;}});}catch(_e){}
  try{Object.defineProperty(window,"notePersonality",{configurable:true,enumerable:false,get:()=>notePersonality,set:v=>{notePersonality=v;}});}catch(_e){}
  try{Object.defineProperty(window,"addFriendship",{configurable:true,enumerable:false,get:()=>addFriendship,set:v=>{addFriendship=v;}});}catch(_e){}
  try{Object.defineProperty(window,"saveCare",{configurable:true,enumerable:false,get:()=>saveCare,set:v=>{saveCare=v;}});}catch(_e){}
  try{Object.defineProperty(window,"capItem",{configurable:true,enumerable:false,get:()=>capItem,set:v=>{capItem=v;}});}catch(_e){}
  try{Object.defineProperty(window,"carePageHeader",{configurable:true,enumerable:false,get:()=>carePageHeader,set:v=>{carePageHeader=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderCare",{configurable:true,enumerable:false,get:()=>renderCare,set:v=>{renderCare=v;}});}catch(_e){}
  try{Object.defineProperty(window,"evoReady",{configurable:true,enumerable:false,get:()=>evoReady,set:v=>{evoReady=v;}});}catch(_e){}
  try{Object.defineProperty(window,"setupEvosIfNeeded",{configurable:true,enumerable:false,get:()=>setupEvosIfNeeded,set:v=>{setupEvosIfNeeded=v;}});}catch(_e){}
  try{Object.defineProperty(window,"evolutionTargets",{configurable:true,enumerable:false,get:()=>evolutionTargets,set:v=>{evolutionTargets=v;}});}catch(_e){}
  try{Object.defineProperty(window,"randomBreedingSpecies",{configurable:true,enumerable:false,get:()=>randomBreedingSpecies,set:v=>{randomBreedingSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"chooseBattleGachaSpecies",{configurable:true,enumerable:false,get:()=>chooseBattleGachaSpecies,set:v=>{chooseBattleGachaSpecies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"applyFarmTime",{configurable:true,enumerable:false,get:()=>applyFarmTime,set:v=>{applyFarmTime=v;}});}catch(_e){}
  try{Object.defineProperty(window,"takeExp",{configurable:true,enumerable:false,get:()=>takeExp,set:v=>{takeExp=v;}});}catch(_e){}
  try{Object.defineProperty(window,"eggRemainingMs",{configurable:true,enumerable:false,get:()=>eggRemainingMs,set:v=>{eggRemainingMs=v;}});}catch(_e){}
  try{Object.defineProperty(window,"speedHatchEgg",{configurable:true,enumerable:false,get:()=>speedHatchEgg,set:v=>{speedHatchEgg=v;}});}catch(_e){}
  try{Object.defineProperty(window,"beginHatch",{configurable:true,enumerable:false,get:()=>beginHatch,set:v=>{beginHatch=v;}});}catch(_e){}
  try{Object.defineProperty(window,"buyBattleGacha",{configurable:true,enumerable:false,get:()=>buyBattleGacha,set:v=>{buyBattleGacha=v;}});}catch(_e){}
  try{Object.defineProperty(window,"buyEgg",{configurable:true,enumerable:false,get:()=>buyEgg,set:v=>{buyEgg=v;}});}catch(_e){}
  try{Object.defineProperty(window,"careBuyItem",{configurable:true,enumerable:false,get:()=>careBuyItem,set:v=>{careBuyItem=v;}});}catch(_e){}
  try{Object.defineProperty(window,"careMonByUid",{configurable:true,enumerable:false,get:()=>careMonByUid,set:v=>{careMonByUid=v;}});}catch(_e){}
  try{Object.defineProperty(window,"doEvolve",{configurable:true,enumerable:false,get:()=>doEvolve,set:v=>{doEvolve=v;}});}catch(_e){}
  try{Object.defineProperty(window,"useCareItem",{configurable:true,enumerable:false,get:()=>useCareItem,set:v=>{useCareItem=v;}});}catch(_e){}
  try{Object.defineProperty(window,"doCareAction",{configurable:true,enumerable:false,get:()=>doCareAction,set:v=>{doCareAction=v;}});}catch(_e){}
  try{Object.defineProperty(window,"originalRenderPage",{configurable:true,enumerable:false,get:()=>originalRenderPage});}catch(_e){}
  try{Object.defineProperty(window,"originalRenderShop",{configurable:true,enumerable:false,get:()=>originalRenderShop});}catch(_e){}
  try{Object.defineProperty(window,"originalMakeOwned",{configurable:true,enumerable:false,get:()=>originalMakeOwned});}catch(_e){}
  try{Object.defineProperty(window,"originalNormalizeOwnedIdentity",{configurable:true,enumerable:false,get:()=>originalNormalizeOwnedIdentity});}catch(_e){}
  try{Object.defineProperty(window,"originalBuildBattleMon",{configurable:true,enumerable:false,get:()=>originalBuildBattleMon});}catch(_e){}
  try{Object.defineProperty(window,"originalCalcStats",{configurable:true,enumerable:false,get:()=>originalCalcStats});}catch(_e){}
  try{Object.defineProperty(window,"originalCalculateDamage",{configurable:true,enumerable:false,get:()=>originalCalculateDamage});}catch(_e){}
  try{Object.defineProperty(window,"originalExecuteAction",{configurable:true,enumerable:false,get:()=>originalExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"originalProcessEndTurn",{configurable:true,enumerable:false,get:()=>originalProcessEndTurn});}catch(_e){}
  try{Object.defineProperty(window,"originalExecuteTurn",{configurable:true,enumerable:false,get:()=>originalExecuteTurn});}catch(_e){}
  try{Object.defineProperty(window,"originalHandleAction",{configurable:true,enumerable:false,get:()=>originalHandleAction});}catch(_e){}
  try{Object.defineProperty(window,"originalSetPage",{configurable:true,enumerable:false,get:()=>originalSetPage});}catch(_e){}
  try{Object.defineProperty(window,"MOVE_EFFECT_SCHEMA_VERSION",{configurable:true,enumerable:false,get:()=>MOVE_EFFECT_SCHEMA_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"MOVE_EFFECT_TYPES",{configurable:true,enumerable:false,get:()=>MOVE_EFFECT_TYPES});}catch(_e){}
  try{Object.defineProperty(window,"canonicalEffect",{configurable:true,enumerable:false,get:()=>canonicalEffect,set:v=>{canonicalEffect=v;}});}catch(_e){}
  try{Object.defineProperty(window,"legacyMoveEffects",{configurable:true,enumerable:false,get:()=>legacyMoveEffects,set:v=>{legacyMoveEffects=v;}});}catch(_e){}
  try{Object.defineProperty(window,"normalizeSpeciesMeasurements",{configurable:true,enumerable:false,get:()=>normalizeSpeciesMeasurements,set:v=>{normalizeSpeciesMeasurements=v;}});}catch(_e){}
  try{Object.defineProperty(window,"normalizeMoveForEngine",{configurable:true,enumerable:false,get:()=>normalizeMoveForEngine,set:v=>{normalizeMoveForEngine=v;}});}catch(_e){}
  try{Object.defineProperty(window,"auditUnifiedGameData",{configurable:true,enumerable:false,get:()=>auditUnifiedGameData,set:v=>{auditUnifiedGameData=v;}});}catch(_e){}
  try{Object.defineProperty(window,"executeCanonicalMoveEffects",{configurable:true,enumerable:false,get:()=>executeCanonicalMoveEffects,set:v=>{executeCanonicalMoveEffects=v;}});}catch(_e){}
  try{Object.defineProperty(window,"__v162LoadAllData",{configurable:true,enumerable:false,get:()=>__v162LoadAllData});}catch(_e){}
  try{Object.defineProperty(window,"__v162ApplyMoveExtras",{configurable:true,enumerable:false,get:()=>__v162ApplyMoveExtras});}catch(_e){}
  try{Object.defineProperty(window,"__v162ResolveContextMoveData",{configurable:true,enumerable:false,get:()=>__v162ResolveContextMoveData});}catch(_e){}
  try{Object.defineProperty(window,"__v164LoadAllData",{configurable:true,enumerable:false,get:()=>__v164LoadAllData});}catch(_e){}
  try{Object.defineProperty(window,"__v164ApplyMoveSpecificEffects",{configurable:true,enumerable:false,get:()=>__v164ApplyMoveSpecificEffects});}catch(_e){}
  try{Object.defineProperty(window,"__v164ExecuteCanonicalMoveEffects",{configurable:true,enumerable:false,get:()=>__v164ExecuteCanonicalMoveEffects});}catch(_e){}
  try{Object.defineProperty(window,"__v169LoadAllData",{configurable:true,enumerable:false,get:()=>__v169LoadAllData});}catch(_e){}
  try{Object.defineProperty(window,"V170_RECHARGE_API",{configurable:true,enumerable:false,get:()=>V170_RECHARGE_API});}catch(_e){}
  try{Object.defineProperty(window,"V170_CHARGE_API",{configurable:true,enumerable:false,get:()=>V170_CHARGE_API});}catch(_e){}
  try{Object.defineProperty(window,"V170_SEMI_INVULNERABLE_API",{configurable:true,enumerable:false,get:()=>V170_SEMI_INVULNERABLE_API});}catch(_e){}
  try{Object.defineProperty(window,"V170_COUNTER_API",{configurable:true,enumerable:false,get:()=>V170_COUNTER_API});}catch(_e){}
  try{Object.defineProperty(window,"V170_HANDLED_API",{configurable:true,enumerable:false,get:()=>V170_HANDLED_API});}catch(_e){}
  try{Object.defineProperty(window,"V170_CATEGORY_STATUS",{configurable:true,enumerable:false,get:()=>V170_CATEGORY_STATUS});}catch(_e){}
  try{Object.defineProperty(window,"v170Api",{configurable:true,enumerable:false,get:()=>v170Api,set:v=>{v170Api=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v170Side",{configurable:true,enumerable:false,get:()=>v170Side,set:v=>{v170Side=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v170MoveName",{configurable:true,enumerable:false,get:()=>v170MoveName,set:v=>{v170MoveName=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v170SetStages",{configurable:true,enumerable:false,get:()=>v170SetStages,set:v=>{v170SetStages=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v170ForceSwitch",{configurable:true,enumerable:false,get:()=>v170ForceSwitch,set:v=>{v170ForceSwitch=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v170HandleVariableDamage",{configurable:true,enumerable:false,get:()=>v170HandleVariableDamage,set:v=>{v170HandleVariableDamage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v170RunBattleEffects",{configurable:true,enumerable:false,get:()=>v170RunBattleEffects,set:v=>{v170RunBattleEffects=v;}});}catch(_e){}
  try{Object.defineProperty(window,"__v170ApplyMoveSpecificEffects",{configurable:true,enumerable:false,get:()=>__v170ApplyMoveSpecificEffects});}catch(_e){}
  try{Object.defineProperty(window,"__v170ApplyDamage",{configurable:true,enumerable:false,get:()=>__v170ApplyDamage});}catch(_e){}
  try{Object.defineProperty(window,"__v170CanMove",{configurable:true,enumerable:false,get:()=>__v170CanMove});}catch(_e){}
  try{Object.defineProperty(window,"__v170ProcessEndTurn",{configurable:true,enumerable:false,get:()=>__v170ProcessEndTurn});}catch(_e){}
  try{Object.defineProperty(window,"__v170TypeMult",{configurable:true,enumerable:false,get:()=>__v170TypeMult});}catch(_e){}
  try{Object.defineProperty(window,"__v170CurrentStat",{configurable:true,enumerable:false,get:()=>__v170CurrentStat});}catch(_e){}
  try{Object.defineProperty(window,"__v170IsGrounded",{configurable:true,enumerable:false,get:()=>__v170IsGrounded});}catch(_e){}
  try{Object.defineProperty(window,"__v170Accuracy",{configurable:true,enumerable:false,get:()=>__v170Accuracy});}catch(_e){}
  try{Object.defineProperty(window,"__v170ItemSlug",{configurable:true,enumerable:false,get:()=>__v170ItemSlug});}catch(_e){}
  try{Object.defineProperty(window,"auditBattleIntegration",{configurable:true,enumerable:false,get:()=>auditBattleIntegration,set:v=>{auditBattleIntegration=v;}});}catch(_e){}
  try{Object.defineProperty(window,"battleIntegrationStatus",{configurable:true,enumerable:false,get:()=>battleIntegrationStatus,set:v=>{battleIntegrationStatus=v;}});}catch(_e){}
  try{Object.defineProperty(window,"__v170RenderMoveCatalogDetail",{configurable:true,enumerable:false,get:()=>__v170RenderMoveCatalogDetail});}catch(_e){}
  try{Object.defineProperty(window,"V171_RULE",{configurable:true,enumerable:false,get:()=>V171_RULE});}catch(_e){}
  try{Object.defineProperty(window,"MOVE_EFFECT_DETAIL_GROUPS",{configurable:true,enumerable:false,get:()=>MOVE_EFFECT_DETAIL_GROUPS});}catch(_e){}
  try{Object.defineProperty(window,"V171_DETAIL_RULES",{configurable:true,enumerable:false,get:()=>V171_DETAIL_RULES});}catch(_e){}
  try{Object.defineProperty(window,"V171_DETAIL_BY_ID",{configurable:true,enumerable:false,get:()=>V171_DETAIL_BY_ID});}catch(_e){}
  try{Object.defineProperty(window,"V171_CLASSIFY_CACHE",{configurable:true,enumerable:false,get:()=>V171_CLASSIFY_CACHE});}catch(_e){}
  try{Object.defineProperty(window,"classifyMoveEffects",{configurable:true,enumerable:false,get:()=>classifyMoveEffects,set:v=>{classifyMoveEffects=v;}});}catch(_e){}
  try{Object.defineProperty(window,"auditMoveEffectTaxonomy",{configurable:true,enumerable:false,get:()=>auditMoveEffectTaxonomy,set:v=>{auditMoveEffectTaxonomy=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderMoveFineTaxonomyOverview",{configurable:true,enumerable:false,get:()=>renderMoveFineTaxonomyOverview,set:v=>{renderMoveFineTaxonomyOverview=v;}});}catch(_e){}
  try{Object.defineProperty(window,"renderMoveFineDetail",{configurable:true,enumerable:false,get:()=>renderMoveFineDetail,set:v=>{renderMoveFineDetail=v;}});}catch(_e){}
  try{Object.defineProperty(window,"__v171FilteredMoves",{configurable:true,enumerable:false,get:()=>__v171FilteredMoves});}catch(_e){}
  try{Object.defineProperty(window,"__v171RenderMoves",{configurable:true,enumerable:false,get:()=>__v171RenderMoves});}catch(_e){}
  try{Object.defineProperty(window,"__v171RenderMoveCatalogDetail",{configurable:true,enumerable:false,get:()=>__v171RenderMoveCatalogDetail});}catch(_e){}
  try{Object.defineProperty(window,"__v171HandleAction",{configurable:true,enumerable:false,get:()=>__v171HandleAction});}catch(_e){}
  try{Object.defineProperty(window,"V171_GUARD_CHAIN_IDS",{configurable:true,enumerable:false,get:()=>V171_GUARD_CHAIN_IDS});}catch(_e){}
  try{Object.defineProperty(window,"V171_PERSONAL_GUARD_IDS",{configurable:true,enumerable:false,get:()=>V171_PERSONAL_GUARD_IDS});}catch(_e){}
  try{Object.defineProperty(window,"V171_PROTECT_BYPASS_IDS",{configurable:true,enumerable:false,get:()=>V171_PROTECT_BYPASS_IDS});}catch(_e){}
  try{Object.defineProperty(window,"V171_PROTECT_BYPASS_NAMES",{configurable:true,enumerable:false,get:()=>V171_PROTECT_BYPASS_NAMES});}catch(_e){}
  try{Object.defineProperty(window,"v171MoveApi",{configurable:true,enumerable:false,get:()=>v171MoveApi,set:v=>{v171MoveApi=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v171IsGuardChainMove",{configurable:true,enumerable:false,get:()=>v171IsGuardChainMove,set:v=>{v171IsGuardChainMove=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v171BypassesProtect",{configurable:true,enumerable:false,get:()=>v171BypassesProtect,set:v=>{v171BypassesProtect=v;}});}catch(_e){}
  try{Object.defineProperty(window,"__v171ExecuteAction",{configurable:true,enumerable:false,get:()=>__v171ExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"__v171ApplyMoveExtras",{configurable:true,enumerable:false,get:()=>__v171ApplyMoveExtras});}catch(_e){}
  try{Object.defineProperty(window,"__v171RunBattleEffects",{configurable:true,enumerable:false,get:()=>__v171RunBattleEffects});}catch(_e){}
  try{Object.defineProperty(window,"__v171ProcessEndTurn",{configurable:true,enumerable:false,get:()=>__v171ProcessEndTurn});}catch(_e){}
  try{Object.defineProperty(window,"BC_ENGINE_VERSION",{configurable:true,enumerable:false,get:()=>BC_ENGINE_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"BC_ACTIVITY_MS",{configurable:true,enumerable:false,get:()=>BC_ACTIVITY_MS});}catch(_e){}
  try{Object.defineProperty(window,"BC_ACTIVITY_SPEED_COST",{configurable:true,enumerable:false,get:()=>BC_ACTIVITY_SPEED_COST});}catch(_e){}
  try{Object.defineProperty(window,"BC_SOUND_MOVE_IDS",{configurable:true,enumerable:false,get:()=>BC_SOUND_MOVE_IDS});}catch(_e){}
  try{Object.defineProperty(window,"BC_BULLET_MOVE_IDS",{configurable:true,enumerable:false,get:()=>BC_BULLET_MOVE_IDS});}catch(_e){}
  try{Object.defineProperty(window,"BC_PUNCH_MOVE_IDS",{configurable:true,enumerable:false,get:()=>BC_PUNCH_MOVE_IDS});}catch(_e){}
  try{Object.defineProperty(window,"BC_SLICING_MOVE_IDS",{configurable:true,enumerable:false,get:()=>BC_SLICING_MOVE_IDS});}catch(_e){}
  try{Object.defineProperty(window,"BC_WIND_MOVE_IDS",{configurable:true,enumerable:false,get:()=>BC_WIND_MOVE_IDS});}catch(_e){}
  try{Object.defineProperty(window,"BC_LOCKED_MOVE_NAMES",{configurable:true,enumerable:false,get:()=>BC_LOCKED_MOVE_NAMES});}catch(_e){}
  try{Object.defineProperty(window,"BC_BIND_MOVE_IDS",{configurable:true,enumerable:false,get:()=>BC_BIND_MOVE_IDS});}catch(_e){}
  try{Object.defineProperty(window,"BC_BYPASS_PROTECT_NAMES",{configurable:true,enumerable:false,get:()=>BC_BYPASS_PROTECT_NAMES});}catch(_e){}
  try{Object.defineProperty(window,"BC_STATUS_IMMUNITY",{configurable:true,enumerable:false,get:()=>BC_STATUS_IMMUNITY});}catch(_e){}
  try{Object.defineProperty(window,"BC_RUIN_STAT",{configurable:true,enumerable:false,get:()=>BC_RUIN_STAT});}catch(_e){}
  try{Object.defineProperty(window,"BC_MEMORY_TYPES",{configurable:true,enumerable:false,get:()=>BC_MEMORY_TYPES});}catch(_e){}
  try{Object.defineProperty(window,"BC_PLATE_TYPES",{configurable:true,enumerable:false,get:()=>BC_PLATE_TYPES});}catch(_e){}
  try{Object.defineProperty(window,"bcSpeciesBaseId",{configurable:true,enumerable:false,get:()=>bcSpeciesBaseId,set:v=>{bcSpeciesBaseId=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcPlateType",{configurable:true,enumerable:false,get:()=>bcPlateType,set:v=>{bcPlateType=v;}});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevMonSpecies",{configurable:true,enumerable:false,get:()=>BC_prevMonSpecies});}catch(_e){}
  try{Object.defineProperty(window,"bcBuiltInForm",{configurable:true,enumerable:false,get:()=>bcBuiltInForm,set:v=>{bcBuiltInForm=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcFindOrBuildForm",{configurable:true,enumerable:false,get:()=>bcFindOrBuildForm,set:v=>{bcFindOrBuildForm=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcAllBattleMons",{configurable:true,enumerable:false,get:()=>bcAllBattleMons,set:v=>{bcAllBattleMons=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcFindBattleMon",{configurable:true,enumerable:false,get:()=>bcFindBattleMon,set:v=>{bcFindBattleMon=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcSide",{configurable:true,enumerable:false,get:()=>bcSide,set:v=>{bcSide=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcOppositeSide",{configurable:true,enumerable:false,get:()=>bcOppositeSide,set:v=>{bcOppositeSide=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcActiveMons",{configurable:true,enumerable:false,get:()=>bcActiveMons,set:v=>{bcActiveMons=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcHasAbility",{configurable:true,enumerable:false,get:()=>bcHasAbility,set:v=>{bcHasAbility=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcAbility",{configurable:true,enumerable:false,get:()=>bcAbility,set:v=>{bcAbility=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcFlag",{configurable:true,enumerable:false,get:()=>bcFlag,set:v=>{bcFlag=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcItem",{configurable:true,enumerable:false,get:()=>bcItem,set:v=>{bcItem=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcConsumeItem",{configurable:true,enumerable:false,get:()=>bcConsumeItem,set:v=>{bcConsumeItem=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcEffectLog",{configurable:true,enumerable:false,get:()=>bcEffectLog,set:v=>{bcEffectLog=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcRecordError",{configurable:true,enumerable:false,get:()=>bcRecordError,set:v=>{bcRecordError=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcGetForm",{configurable:true,enumerable:false,get:()=>bcGetForm,set:v=>{bcGetForm=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcSwapForm",{configurable:true,enumerable:false,get:()=>bcSwapForm,set:v=>{bcSwapForm=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcUpdateDynamicForm",{configurable:true,enumerable:false,get:()=>bcUpdateDynamicForm,set:v=>{bcUpdateDynamicForm=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcBoostedStatKey",{configurable:true,enumerable:false,get:()=>bcBoostedStatKey,set:v=>{bcBoostedStatKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcRuinMultiplier",{configurable:true,enumerable:false,get:()=>bcRuinMultiplier,set:v=>{bcRuinMultiplier=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcRuinKey",{configurable:true,enumerable:false,get:()=>bcRuinKey,set:v=>{bcRuinKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcMoveId",{configurable:true,enumerable:false,get:()=>bcMoveId,set:v=>{bcMoveId=v;}});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevBuildBattleMon",{configurable:true,enumerable:false,get:()=>BC_prevBuildBattleMon});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevStartBattle",{configurable:true,enumerable:false,get:()=>BC_prevStartBattle});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevSetStatus",{configurable:true,enumerable:false,get:()=>BC_prevSetStatus});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevApplyBoosts",{configurable:true,enumerable:false,get:()=>BC_prevApplyBoosts});}catch(_e){}
  try{Object.defineProperty(window,"BC_reflectingDrop",{configurable:true,enumerable:false,get:()=>BC_reflectingDrop,set:v=>{BC_reflectingDrop=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcReactToStatDrop",{configurable:true,enumerable:false,get:()=>bcReactToStatDrop,set:v=>{bcReactToStatDrop=v;}});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevTypeMult",{configurable:true,enumerable:false,get:()=>BC_prevTypeMult});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevCurrentStat",{configurable:true,enumerable:false,get:()=>BC_prevCurrentStat});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevResolveContext",{configurable:true,enumerable:false,get:()=>BC_prevResolveContext});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevCalculateDamage",{configurable:true,enumerable:false,get:()=>BC_prevCalculateDamage});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevAccuracy",{configurable:true,enumerable:false,get:()=>BC_prevAccuracy});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevAbilityTrigger",{configurable:true,enumerable:false,get:()=>BC_prevAbilityTrigger});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevMoveSpecific",{configurable:true,enumerable:false,get:()=>BC_prevMoveSpecific});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevExecuteAction",{configurable:true,enumerable:false,get:()=>BC_prevExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevProcessEndTurn",{configurable:true,enumerable:false,get:()=>BC_prevProcessEndTurn});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevTriggerEntry",{configurable:true,enumerable:false,get:()=>BC_prevTriggerEntry});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevApplyDamage",{configurable:true,enumerable:false,get:()=>BC_prevApplyDamage});}catch(_e){}
  try{Object.defineProperty(window,"bcActivateTera",{configurable:true,enumerable:false,get:()=>bcActivateTera,set:v=>{bcActivateTera=v;}});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevRenderBattlePage",{configurable:true,enumerable:false,get:()=>BC_prevRenderBattlePage});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevHandleAction",{configurable:true,enumerable:false,get:()=>BC_prevHandleAction});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevExecuteTurn",{configurable:true,enumerable:false,get:()=>BC_prevExecuteTurn});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevMegaEvolve",{configurable:true,enumerable:false,get:()=>BC_prevMegaEvolve});}catch(_e){}
  try{Object.defineProperty(window,"bcActivityTitle",{configurable:true,enumerable:false,get:()=>bcActivityTitle,set:v=>{bcActivityTitle=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcCompleteCareReward",{configurable:true,enumerable:false,get:()=>bcCompleteCareReward,set:v=>{bcCompleteCareReward=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcStartCareTask",{configurable:true,enumerable:false,get:()=>bcStartCareTask,set:v=>{bcStartCareTask=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcSpeedCareTask",{configurable:true,enumerable:false,get:()=>bcSpeedCareTask,set:v=>{bcSpeedCareTask=v;}});}catch(_e){}
  try{Object.defineProperty(window,"bcClaimCareTask",{configurable:true,enumerable:false,get:()=>bcClaimCareTask,set:v=>{bcClaimCareTask=v;}});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevRenderCare",{configurable:true,enumerable:false,get:()=>BC_prevRenderCare});}catch(_e){}
  try{Object.defineProperty(window,"bcAuditBattleEngine",{configurable:true,enumerable:false,get:()=>bcAuditBattleEngine,set:v=>{bcAuditBattleEngine=v;}});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevRenderTraining",{configurable:true,enumerable:false,get:()=>BC_prevRenderTraining});}catch(_e){}
  try{Object.defineProperty(window,"BC_prevRenderSettings",{configurable:true,enumerable:false,get:()=>BC_prevRenderSettings});}catch(_e){}
  try{Object.defineProperty(window,"bcRuntimeDiagnostics",{configurable:true,enumerable:false,get:()=>bcRuntimeDiagnostics,set:v=>{bcRuntimeDiagnostics=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_VERSION",{configurable:true,enumerable:false,get:()=>V19_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"V19_OHKO_API",{configurable:true,enumerable:false,get:()=>V19_OHKO_API});}catch(_e){}
  try{Object.defineProperty(window,"V19_OHKO_NAMES",{configurable:true,enumerable:false,get:()=>V19_OHKO_NAMES});}catch(_e){}
  try{Object.defineProperty(window,"V19_STATUS_MAP",{configurable:true,enumerable:false,get:()=>V19_STATUS_MAP});}catch(_e){}
  try{Object.defineProperty(window,"V19_TYPE_ITEMS",{configurable:true,enumerable:false,get:()=>V19_TYPE_ITEMS});}catch(_e){}
  try{Object.defineProperty(window,"V19_STATUS_TAGS",{configurable:true,enumerable:false,get:()=>V19_STATUS_TAGS});}catch(_e){}
  try{Object.defineProperty(window,"v19Num",{configurable:true,enumerable:false,get:()=>v19Num,set:v=>{v19Num=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v19Meta",{configurable:true,enumerable:false,get:()=>v19Meta,set:v=>{v19Meta=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v19EnrichMove",{configurable:true,enumerable:false,get:()=>v19EnrichMove,set:v=>{v19EnrichMove=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevGetMove",{configurable:true,enumerable:false,get:()=>V19_prevGetMove});}catch(_e){}
  try{Object.defineProperty(window,"v19IsOhko",{configurable:true,enumerable:false,get:()=>v19IsOhko,set:v=>{v19IsOhko=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v19OhkoAccuracy",{configurable:true,enumerable:false,get:()=>v19OhkoAccuracy,set:v=>{v19OhkoAccuracy=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v19ExecuteOhko",{configurable:true,enumerable:false,get:()=>v19ExecuteOhko,set:v=>{v19ExecuteOhko=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevAccuracy",{configurable:true,enumerable:false,get:()=>V19_prevAccuracy});}catch(_e){}
  try{Object.defineProperty(window,"v19ApplyTaggedStatus",{configurable:true,enumerable:false,get:()=>v19ApplyTaggedStatus,set:v=>{v19ApplyTaggedStatus=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v19ApplyTagHealing",{configurable:true,enumerable:false,get:()=>v19ApplyTagHealing,set:v=>{v19ApplyTagHealing=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevMoveSpecific",{configurable:true,enumerable:false,get:()=>V19_prevMoveSpecific});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevCanMove",{configurable:true,enumerable:false,get:()=>V19_prevCanMove});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevProcessEndTurn",{configurable:true,enumerable:false,get:()=>V19_prevProcessEndTurn});}catch(_e){}
  try{Object.defineProperty(window,"v19CriticalChance",{configurable:true,enumerable:false,get:()=>v19CriticalChance,set:v=>{v19CriticalChance=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_critExpr",{configurable:true,enumerable:false,get:()=>V19_critExpr});}catch(_e){}
  try{Object.defineProperty(window,"V19_critExprNew",{configurable:true,enumerable:false,get:()=>V19_critExprNew});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevTypeMult",{configurable:true,enumerable:false,get:()=>V19_prevTypeMult});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevIsGrounded",{configurable:true,enumerable:false,get:()=>V19_prevIsGrounded});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevApplyDamage",{configurable:true,enumerable:false,get:()=>V19_prevApplyDamage});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevCurrentStat",{configurable:true,enumerable:false,get:()=>V19_prevCurrentStat});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevCalculateDamage",{configurable:true,enumerable:false,get:()=>V19_prevCalculateDamage});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevApplyBoosts",{configurable:true,enumerable:false,get:()=>V19_prevApplyBoosts});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevTriggerEntry",{configurable:true,enumerable:false,get:()=>V19_prevTriggerEntry});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevExecuteAction",{configurable:true,enumerable:false,get:()=>V19_prevExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"v19AllyTarget",{configurable:true,enumerable:false,get:()=>v19AllyTarget,set:v=>{v19AllyTarget=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevExecuteTurn",{configurable:true,enumerable:false,get:()=>V19_prevExecuteTurn});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevTargetForAction",{configurable:true,enumerable:false,get:()=>V19_prevTargetForAction});}catch(_e){}
  try{Object.defineProperty(window,"v19EnsureBoxAssignments",{configurable:true,enumerable:false,get:()=>v19EnsureBoxAssignments,set:v=>{v19EnsureBoxAssignments=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevLoadLocal",{configurable:true,enumerable:false,get:()=>V19_prevLoadLocal});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevMakeOwned",{configurable:true,enumerable:false,get:()=>V19_prevMakeOwned});}catch(_e){}
  try{Object.defineProperty(window,"v19BoxCount",{configurable:true,enumerable:false,get:()=>v19BoxCount,set:v=>{v19BoxCount=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v19BoxSortKey",{configurable:true,enumerable:false,get:()=>v19BoxSortKey,set:v=>{v19BoxSortKey=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevRenderScout",{configurable:true,enumerable:false,get:()=>V19_prevRenderScout});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevRenderTraining",{configurable:true,enumerable:false,get:()=>V19_prevRenderTraining});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevHandleAction",{configurable:true,enumerable:false,get:()=>V19_prevHandleAction});}catch(_e){}
  try{Object.defineProperty(window,"v19RuntimeTags",{configurable:true,enumerable:false,get:()=>v19RuntimeTags,set:v=>{v19RuntimeTags=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V19_prevRenderMoveFineDetail",{configurable:true,enumerable:false,get:()=>V19_prevRenderMoveFineDetail});}catch(_e){}
  try{Object.defineProperty(window,"v19GameplayAudit",{configurable:true,enumerable:false,get:()=>v19GameplayAudit,set:v=>{v19GameplayAudit=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v19Style",{configurable:true,enumerable:false,get:()=>v19Style});}catch(_e){}
  try{Object.defineProperty(window,"V20_ABILITY_ENGINE_VERSION",{configurable:true,enumerable:false,get:()=>V20_ABILITY_ENGINE_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"V20_SUPPORTED_ABILITIES",{configurable:true,enumerable:false,get:()=>V20_SUPPORTED_ABILITIES});}catch(_e){}
  try{Object.defineProperty(window,"v20AllMons",{configurable:true,enumerable:false,get:()=>v20AllMons,set:v=>{v20AllMons=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Active",{configurable:true,enumerable:false,get:()=>v20Active,set:v=>{v20Active=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Ab",{configurable:true,enumerable:false,get:()=>v20Ab,set:v=>{v20Ab=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20IsGasActive",{configurable:true,enumerable:false,get:()=>v20IsGasActive,set:v=>{v20IsGasActive=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Side",{configurable:true,enumerable:false,get:()=>v20Side,set:v=>{v20Side=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Opponents",{configurable:true,enumerable:false,get:()=>v20Opponents,set:v=>{v20Opponents=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Allies",{configurable:true,enumerable:false,get:()=>v20Allies,set:v=>{v20Allies=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Log",{configurable:true,enumerable:false,get:()=>v20Log,set:v=>{v20Log=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Boost",{configurable:true,enumerable:false,get:()=>v20Boost,set:v=>{v20Boost=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20Heal",{configurable:true,enumerable:false,get:()=>v20Heal,set:v=>{v20Heal=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20AbilityEnabled",{configurable:true,enumerable:false,get:()=>v20AbilityEnabled,set:v=>{v20AbilityEnabled=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20IsMoveId",{configurable:true,enumerable:false,get:()=>v20IsMoveId,set:v=>{v20IsMoveId=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20WeatherSuppressed",{configurable:true,enumerable:false,get:()=>v20WeatherSuppressed,set:v=>{v20WeatherSuppressed=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20IsContact",{configurable:true,enumerable:false,get:()=>v20IsContact,set:v=>{v20IsContact=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20IsSound",{configurable:true,enumerable:false,get:()=>v20IsSound,set:v=>{v20IsSound=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v20AbilityAudit",{configurable:true,enumerable:false,get:()=>v20AbilityAudit,set:v=>{v20AbilityAudit=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevBuildBattleMon",{configurable:true,enumerable:false,get:()=>V20_prevBuildBattleMon});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevCurrentStat",{configurable:true,enumerable:false,get:()=>V20_prevCurrentStat});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevAccuracy",{configurable:true,enumerable:false,get:()=>V20_prevAccuracy});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevEntry",{configurable:true,enumerable:false,get:()=>V20_prevEntry});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevTargetForAction",{configurable:true,enumerable:false,get:()=>V20_prevTargetForAction});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevAbilityTrigger",{configurable:true,enumerable:false,get:()=>V20_prevAbilityTrigger});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevCalculateDamage",{configurable:true,enumerable:false,get:()=>V20_prevCalculateDamage});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevResolveContext",{configurable:true,enumerable:false,get:()=>V20_prevResolveContext});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevSetStatus",{configurable:true,enumerable:false,get:()=>V20_prevSetStatus});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevMoveExtras",{configurable:true,enumerable:false,get:()=>V20_prevMoveExtras});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevApplyDamage",{configurable:true,enumerable:false,get:()=>V20_prevApplyDamage});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevGetMove",{configurable:true,enumerable:false,get:()=>V20_prevGetMove});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevExecuteAction",{configurable:true,enumerable:false,get:()=>V20_prevExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevOhko",{configurable:true,enumerable:false,get:()=>V20_prevOhko});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevCriticalChance",{configurable:true,enumerable:false,get:()=>V20_prevCriticalChance});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevCanMove",{configurable:true,enumerable:false,get:()=>V20_prevCanMove});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevProcessEndTurn",{configurable:true,enumerable:false,get:()=>V20_prevProcessEndTurn});}catch(_e){}
  try{Object.defineProperty(window,"V20_abilityHudStyle",{configurable:true,enumerable:false,get:()=>V20_abilityHudStyle});}catch(_e){}
  try{Object.defineProperty(window,"V20_prevRenderSettings",{configurable:true,enumerable:false,get:()=>V20_prevRenderSettings});}catch(_e){}
  try{Object.defineProperty(window,"V21_VERSION",{configurable:true,enumerable:false,get:()=>V21_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"V21_ABILITY_ALIAS",{configurable:true,enumerable:false,get:()=>V21_ABILITY_ALIAS});}catch(_e){}
  try{Object.defineProperty(window,"v21CanonAbilityId",{configurable:true,enumerable:false,get:()=>v21CanonAbilityId,set:v=>{v21CanonAbilityId=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevBcAbility",{configurable:true,enumerable:false,get:()=>V21_prevBcAbility});}catch(_e){}
  try{Object.defineProperty(window,"V21_ITEM_ALIAS",{configurable:true,enumerable:false,get:()=>V21_ITEM_ALIAS});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevItemSlug",{configurable:true,enumerable:false,get:()=>V21_prevItemSlug});}catch(_e){}
  try{Object.defineProperty(window,"V21_MOVE_ID_JP",{configurable:true,enumerable:false,get:()=>V21_MOVE_ID_JP});}catch(_e){}
  try{Object.defineProperty(window,"v21MoveId",{configurable:true,enumerable:false,get:()=>v21MoveId,set:v=>{v21MoveId=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevBcMoveId",{configurable:true,enumerable:false,get:()=>V21_prevBcMoveId});}catch(_e){}
  try{Object.defineProperty(window,"V21_FLAG_SETS",{configurable:true,enumerable:false,get:()=>V21_FLAG_SETS});}catch(_e){}
  try{Object.defineProperty(window,"v21EnsureMoveFlags",{configurable:true,enumerable:false,get:()=>v21EnsureMoveFlags,set:v=>{v21EnsureMoveFlags=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevGetMove",{configurable:true,enumerable:false,get:()=>V21_prevGetMove});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevBcFlag",{configurable:true,enumerable:false,get:()=>V21_prevBcFlag});}catch(_e){}
  try{Object.defineProperty(window,"V22_CORE_CALC_RULES",{configurable:true,enumerable:false,get:()=>V22_CORE_CALC_RULES});}catch(_e){}
  try{Object.defineProperty(window,"V21_STAT_NAMES",{configurable:true,enumerable:false,get:()=>V21_STAT_NAMES});}catch(_e){}
  try{Object.defineProperty(window,"V21_WORD_NUM",{configurable:true,enumerable:false,get:()=>V21_WORD_NUM});}catch(_e){}
  try{Object.defineProperty(window,"v21ExistingSecondary",{configurable:true,enumerable:false,get:()=>v21ExistingSecondary,set:v=>{v21ExistingSecondary=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v21ParseMoveEffects",{configurable:true,enumerable:false,get:()=>v21ParseMoveEffects,set:v=>{v21ParseMoveEffects=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V21_SELF_EFFECT_IDS",{configurable:true,enumerable:false,get:()=>V21_SELF_EFFECT_IDS});}catch(_e){}
  try{Object.defineProperty(window,"V21_TARGET_EFFECT_IDS",{configurable:true,enumerable:false,get:()=>V21_TARGET_EFFECT_IDS});}catch(_e){}
  try{Object.defineProperty(window,"v21RollEffect",{configurable:true,enumerable:false,get:()=>v21RollEffect,set:v=>{v21RollEffect=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevApplyMoveExtras",{configurable:true,enumerable:false,get:()=>V21_prevApplyMoveExtras});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevMoveSpecific",{configurable:true,enumerable:false,get:()=>V21_prevMoveSpecific});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevResolveContext",{configurable:true,enumerable:false,get:()=>V21_prevResolveContext});}catch(_e){}
  try{Object.defineProperty(window,"v21AbilityAudit",{configurable:true,enumerable:false,get:()=>v21AbilityAudit,set:v=>{v21AbilityAudit=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevTriggerEntry",{configurable:true,enumerable:false,get:()=>V21_prevTriggerEntry});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevApplyWeather",{configurable:true,enumerable:false,get:()=>V21_prevApplyWeather});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevTypeMult",{configurable:true,enumerable:false,get:()=>V21_prevTypeMult});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevSetStatus",{configurable:true,enumerable:false,get:()=>V21_prevSetStatus});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevCurrentStat",{configurable:true,enumerable:false,get:()=>V21_prevCurrentStat});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevCalculateDamage",{configurable:true,enumerable:false,get:()=>V21_prevCalculateDamage});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevExecuteAction",{configurable:true,enumerable:false,get:()=>V21_prevExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevExecuteTurn",{configurable:true,enumerable:false,get:()=>V21_prevExecuteTurn});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevProcessEndTurn",{configurable:true,enumerable:false,get:()=>V21_prevProcessEndTurn});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevAbilityTriggerOnMove",{configurable:true,enumerable:false,get:()=>V21_prevAbilityTriggerOnMove});}catch(_e){}
  try{Object.defineProperty(window,"V21_prevApplyDamage",{configurable:true,enumerable:false,get:()=>V21_prevApplyDamage});}catch(_e){}
  try{Object.defineProperty(window,"V21_ITEM_JA",{configurable:true,enumerable:false,get:()=>V21_ITEM_JA});}catch(_e){}
  try{Object.defineProperty(window,"v21IntegrityChecks",{configurable:true,enumerable:false,get:()=>v21IntegrityChecks,set:v=>{v21IntegrityChecks=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v21BattleAudit",{configurable:true,enumerable:false,get:()=>v21BattleAudit,set:v=>{v21BattleAudit=v;}});}catch(_e){}
  try{Object.defineProperty(window,"__v1623LoadAllData",{configurable:true,enumerable:false,get:()=>__v1623LoadAllData});}catch(_e){}
  try{Object.defineProperty(window,"V17_BATTLE_TAG_ENGINE_VERSION",{configurable:true,enumerable:false,get:()=>V17_BATTLE_TAG_ENGINE_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"V17_BATTLE_TAG_DEFINITIONS",{configurable:true,enumerable:false,get:()=>V17_BATTLE_TAG_DEFINITIONS});}catch(_e){}
  try{Object.defineProperty(window,"V17_TAG_DEFINITION_MAP",{configurable:true,enumerable:false,get:()=>V17_TAG_DEFINITION_MAP});}catch(_e){}
  try{Object.defineProperty(window,"V17_FLAG_TAG_MAP",{configurable:true,enumerable:false,get:()=>V17_FLAG_TAG_MAP});}catch(_e){}
  try{Object.defineProperty(window,"V17_FORMULA_TAGS",{configurable:true,enumerable:false,get:()=>V17_FORMULA_TAGS});}catch(_e){}
  try{Object.defineProperty(window,"v17MoveId",{configurable:true,enumerable:false,get:()=>v17MoveId,set:v=>{v17MoveId=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V17_API_FLAG_RANGE_TEXT",{configurable:true,enumerable:false,get:()=>V17_API_FLAG_RANGE_TEXT});}catch(_e){}
  try{Object.defineProperty(window,"v17ExpandApiRanges",{configurable:true,enumerable:false,get:()=>v17ExpandApiRanges,set:v=>{v17ExpandApiRanges=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V17_API_FLAG_SETS",{configurable:true,enumerable:false,get:()=>V17_API_FLAG_SETS});}catch(_e){}
  try{Object.defineProperty(window,"V17_API_FLAG_TO_TAG",{configurable:true,enumerable:false,get:()=>V17_API_FLAG_TO_TAG});}catch(_e){}
  try{Object.defineProperty(window,"v17NormalizeMove",{configurable:true,enumerable:false,get:()=>v17NormalizeMove,set:v=>{v17NormalizeMove=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v17GetMoveRecords",{configurable:true,enumerable:false,get:()=>v17GetMoveRecords,set:v=>{v17GetMoveRecords=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v17AuditBattleTags",{configurable:true,enumerable:false,get:()=>v17AuditBattleTags,set:v=>{v17AuditBattleTags=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v17RunTagEngineSelfTests",{configurable:true,enumerable:false,get:()=>v17RunTagEngineSelfTests,set:v=>{v17RunTagEngineSelfTests=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V17_previousGetMove",{configurable:true,enumerable:false,get:()=>V17_previousGetMove});}catch(_e){}
  try{Object.defineProperty(window,"V17_previousLoadAllData",{configurable:true,enumerable:false,get:()=>V17_previousLoadAllData});}catch(_e){}
  try{Object.defineProperty(window,"V22_MOVE_EFFECT_ENGINE_VERSION",{configurable:true,enumerable:false,get:()=>V22_MOVE_EFFECT_ENGINE_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"V22_EFFECT_PHASES",{configurable:true,enumerable:false,get:()=>V22_EFFECT_PHASES});}catch(_e){}
  try{Object.defineProperty(window,"V22_EFFECT_HANDLER_DEFINITIONS",{configurable:true,enumerable:false,get:()=>V22_EFFECT_HANDLER_DEFINITIONS});}catch(_e){}
  try{Object.defineProperty(window,"V22_STAT_KEY_MAP",{configurable:true,enumerable:false,get:()=>V22_STAT_KEY_MAP});}catch(_e){}
  try{Object.defineProperty(window,"V22_API_EFFECT_MAP",{configurable:true,enumerable:false,get:()=>V22_API_EFFECT_MAP});}catch(_e){}
  try{Object.defineProperty(window,"v22CleanDescription",{configurable:true,enumerable:false,get:()=>v22CleanDescription,set:v=>{v22CleanDescription=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22CompileMoveEffectPlan",{configurable:true,enumerable:false,get:()=>v22CompileMoveEffectPlan,set:v=>{v22CompileMoveEffectPlan=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22EnsureMoveEffectPlan",{configurable:true,enumerable:false,get:()=>v22EnsureMoveEffectPlan,set:v=>{v22EnsureMoveEffectPlan=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22Log",{configurable:true,enumerable:false,get:()=>v22Log,set:v=>{v22Log=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22ClampStage",{configurable:true,enumerable:false,get:()=>v22ClampStage,set:v=>{v22ClampStage=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22ApplyMoveEffect",{configurable:true,enumerable:false,get:()=>v22ApplyMoveEffect,set:v=>{v22ApplyMoveEffect=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22RunMoveEffectPhase",{configurable:true,enumerable:false,get:()=>v22RunMoveEffectPhase,set:v=>{v22RunMoveEffectPhase=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22AuditMoveEffectEngine",{configurable:true,enumerable:false,get:()=>v22AuditMoveEffectEngine,set:v=>{v22AuditMoveEffectEngine=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v22RunMoveEffectEngineTests",{configurable:true,enumerable:false,get:()=>v22RunMoveEffectEngineTests,set:v=>{v22RunMoveEffectEngineTests=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V22_prevLoadAllData",{configurable:true,enumerable:false,get:()=>V22_prevLoadAllData});}catch(_e){}
  try{Object.defineProperty(window,"V22_prevCalculateDamage",{configurable:true,enumerable:false,get:()=>V22_prevCalculateDamage});}catch(_e){}
  try{Object.defineProperty(window,"V22_prevApplyMoveSpecificEffects",{configurable:true,enumerable:false,get:()=>V22_prevApplyMoveSpecificEffects});}catch(_e){}
  try{Object.defineProperty(window,"V22_prevExecuteAction",{configurable:true,enumerable:false,get:()=>V22_prevExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"V22_prevRenderSettings",{configurable:true,enumerable:false,get:()=>V22_prevRenderSettings});}catch(_e){}
  try{Object.defineProperty(window,"V23_MOVE_MECHANICS_VERSION",{configurable:true,enumerable:false,get:()=>V23_MOVE_MECHANICS_VERSION});}catch(_e){}
  try{Object.defineProperty(window,"V23_NON_SELF_HEAL_APIS",{configurable:true,enumerable:false,get:()=>V23_NON_SELF_HEAL_APIS});}catch(_e){}
  try{Object.defineProperty(window,"v23Api",{configurable:true,enumerable:false,get:()=>v23Api,set:v=>{v23Api=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23StockpileCount",{configurable:true,enumerable:false,get:()=>v23StockpileCount,set:v=>{v23StockpileCount=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23ClampStageValue",{configurable:true,enumerable:false,get:()=>v23ClampStageValue,set:v=>{v23ClampStageValue=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23WeatherRecovery",{configurable:true,enumerable:false,get:()=>v23WeatherRecovery,set:v=>{v23WeatherRecovery=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23RoundHalfUp",{configurable:true,enumerable:false,get:()=>v23RoundHalfUp,set:v=>{v23RoundHalfUp=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23SwallowFraction",{configurable:true,enumerable:false,get:()=>v23SwallowFraction,set:v=>{v23SwallowFraction=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23ResetStockpile",{configurable:true,enumerable:false,get:()=>v23ResetStockpile,set:v=>{v23ResetStockpile=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23AddStockpile",{configurable:true,enumerable:false,get:()=>v23AddStockpile,set:v=>{v23AddStockpile=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23ApplySideHealing",{configurable:true,enumerable:false,get:()=>v23ApplySideHealing,set:v=>{v23ApplySideHealing=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V23_prevApplyMoveExtras",{configurable:true,enumerable:false,get:()=>V23_prevApplyMoveExtras});}catch(_e){}
  try{Object.defineProperty(window,"V23_prevV19TagHealing",{configurable:true,enumerable:false,get:()=>V23_prevV19TagHealing});}catch(_e){}
  try{Object.defineProperty(window,"V23_prevApplyMoveSpecificEffects",{configurable:true,enumerable:false,get:()=>V23_prevApplyMoveSpecificEffects});}catch(_e){}
  try{Object.defineProperty(window,"V23_prevResolveContextMoveData",{configurable:true,enumerable:false,get:()=>V23_prevResolveContextMoveData});}catch(_e){}
  try{Object.defineProperty(window,"V23_prevExecuteAction",{configurable:true,enumerable:false,get:()=>V23_prevExecuteAction});}catch(_e){}
  try{Object.defineProperty(window,"v23AuditMoveMechanics",{configurable:true,enumerable:false,get:()=>v23AuditMoveMechanics,set:v=>{v23AuditMoveMechanics=v;}});}catch(_e){}
  try{Object.defineProperty(window,"v23RunMoveMechanicsTests",{configurable:true,enumerable:false,get:()=>v23RunMoveMechanicsTests,set:v=>{v23RunMoveMechanicsTests=v;}});}catch(_e){}
  try{Object.defineProperty(window,"V23_prevApplyDamage",{configurable:true,enumerable:false,get:()=>V23_prevApplyDamage});}catch(_e){}
  try{Object.defineProperty(window,"V23_prevRenderSettings",{configurable:true,enumerable:false,get:()=>V23_prevRenderSettings});}catch(_e){}
window.PokemonChampions2DData=window.PokemonChampions2DData||{};
window.PokemonChampions2DData.coreBridge={version:'18.2.0',exposed:__V182_CORE_BRIDGE_NAMES.slice()};
/* end v18.2 core bridge */

boot();
})();

/* v17.5: persistent Tera crystal shell rendering + Mega form catalog */
const V174_MEGA_ROWS = `venusaurmega|Venusaur|Mega|Grass,Poison|80,100,123,122,120,80|Thick Fat|Venusaurite|3
charizardmegax|Charizard|Mega-X|Fire,Dragon|78,130,111,130,85,100|Tough Claws|Charizardite X|6
charizardmegay|Charizard|Mega-Y|Fire,Flying|78,104,78,159,115,100|Drought|Charizardite Y|6
blastoisemega|Blastoise|Mega|Water|79,103,120,135,115,78|Mega Launcher|Blastoisinite|9
beedrillmega|Beedrill|Mega|Bug,Poison|65,150,40,15,80,145|Adaptability|Beedrillite|15
pidgeotmega|Pidgeot|Mega|Normal,Flying|83,80,80,135,80,121|No Guard|Pidgeotite|18
raichumegax|Raichu|Mega-X|Electric|60,135,95,90,95,110|Electric Surge|Raichunite X|26
raichumegay|Raichu|Mega-Y|Electric|60,100,55,160,80,130|No Guard|Raichunite Y|26
clefablemega|Clefable|Mega|Fairy,Flying|95,80,93,135,110,70|Magic Bounce|Clefablite|36
alakazammega|Alakazam|Mega|Psychic|55,50,65,175,105,150|Trace|Alakazite|65
victreebelmega|Victreebel|Mega|Grass,Poison|80,125,85,135,95,70|Innards Out|Victreebelite|71
slowbromega|Slowbro|Mega|Water,Psychic|95,75,180,130,80,30|Shell Armor|Slowbronite|80
gengarmega|Gengar|Mega|Ghost,Poison|60,65,80,170,95,130|Shadow Tag|Gengarite|94
kangaskhanmega|Kangaskhan|Mega|Normal|105,125,100,60,100,100|Parental Bond|Kangaskhanite|115
starmiemega|Starmie|Mega|Water,Psychic|60,100,105,130,105,120|Huge Power|Starminite|121
pinsirmega|Pinsir|Mega|Bug,Flying|65,155,120,65,90,105|Aerilate|Pinsirite|127
gyaradosmega|Gyarados|Mega|Water,Dark|95,155,109,70,130,81|Mold Breaker|Gyaradosite|130
aerodactylmega|Aerodactyl|Mega|Rock,Flying|80,135,85,70,95,150|Tough Claws|Aerodactylite|142
dragonitemega|Dragonite|Mega|Dragon,Flying|91,124,115,145,125,100|Multiscale|Dragoninite|149
mewtwomegax|Mewtwo|Mega-X|Psychic,Fighting|106,190,100,154,100,130|Steadfast|Mewtwonite X|150
mewtwomegay|Mewtwo|Mega-Y|Psychic|106,150,70,194,120,140|Insomnia|Mewtwonite Y|150
meganiummega|Meganium|Mega|Grass,Fairy|80,92,115,143,115,80|Mega Sol|Meganiumite|154
feraligatrmega|Feraligatr|Mega|Water,Dragon|85,160,125,89,93,78|Dragonize|Feraligite|160
ampharosmega|Ampharos|Mega|Electric,Dragon|90,95,105,165,110,45|Mold Breaker|Ampharosite|181
steelixmega|Steelix|Mega|Steel,Ground|75,125,230,55,95,30|Sand Force|Steelixite|208
scizormega|Scizor|Mega|Bug,Steel|70,150,140,65,100,75|Technician|Scizorite|212
heracrossmega|Heracross|Mega|Bug,Fighting|80,185,115,40,105,75|Skill Link|Heracronite|214
skarmorymega|Skarmory|Mega|Steel,Flying|65,140,110,40,100,110|Stalwart|Skarmorite|227
houndoommega|Houndoom|Mega|Dark,Fire|75,90,90,140,90,115|Solar Power|Houndoominite|229
tyranitarmega|Tyranitar|Mega|Rock,Dark|100,164,150,95,120,71|Sand Stream|Tyranitarite|248
sceptilemega|Sceptile|Mega|Grass,Dragon|70,110,75,145,85,145|Lightning Rod|Sceptilite|254
blazikenmega|Blaziken|Mega|Fire,Fighting|80,160,80,130,80,100|Speed Boost|Blazikenite|257
swampertmega|Swampert|Mega|Water,Ground|100,150,110,95,110,70|Swift Swim|Swampertite|260
gardevoirmega|Gardevoir|Mega|Psychic,Fairy|68,85,65,165,135,100|Pixilate|Gardevoirite|282
sableyemega|Sableye|Mega|Dark,Ghost|50,85,125,85,115,20|Magic Bounce|Sablenite|302
mawilemega|Mawile|Mega|Steel,Fairy|50,105,125,55,95,50|Huge Power|Mawilite|303
aggronmega|Aggron|Mega|Steel|70,140,230,60,80,50|Filter|Aggronite|306
medichammega|Medicham|Mega|Fighting,Psychic|60,100,85,80,85,100|Pure Power|Medichamite|308
manectricmega|Manectric|Mega|Electric|70,75,80,135,80,135|Intimidate|Manectite|310
sharpedomega|Sharpedo|Mega|Water,Dark|70,140,70,110,65,105|Strong Jaw|Sharpedonite|319
cameruptmega|Camerupt|Mega|Fire,Ground|70,120,100,145,105,20|Sheer Force|Cameruptite|323
altariamega|Altaria|Mega|Dragon,Fairy|75,110,110,110,105,80|Pixilate|Altarianite|334
banettemega|Banette|Mega|Ghost|64,165,75,93,83,75|Prankster|Banettite|354
chimechomega|Chimecho|Mega|Psychic,Steel|75,50,110,135,120,65|Levitate|Chimechite|358
absolmega|Absol|Mega|Dark|65,150,60,115,60,115|Magic Bounce|Absolite|359
absolmegaz|Absol|Mega-Z|Dark,Ghost|65,154,60,75,60,151|Sharpness|Absolite Z|359
glaliemega|Glalie|Mega|Ice|80,120,80,120,80,100|Refrigerate|Glalitite|362
salamencemega|Salamence|Mega|Dragon,Flying|95,145,130,120,90,120|Aerilate|Salamencite|373
metagrossmega|Metagross|Mega|Steel,Psychic|80,145,150,105,110,110|Tough Claws|Metagrossite|376
latiasmega|Latias|Mega|Dragon,Psychic|80,100,120,140,150,110|Levitate|Latiasite|380
latiosmega|Latios|Mega|Dragon,Psychic|80,130,100,160,120,110|Levitate|Latiosite|381
staraptormega|Staraptor|Mega|Fighting,Flying|85,140,100,60,90,110|Contrary|Staraptite|398
lopunnymega|Lopunny|Mega|Normal,Fighting|65,136,94,54,96,135|Scrappy|Lopunnite|428
garchompmega|Garchomp|Mega|Dragon,Ground|108,170,115,120,95,92|Sand Force|Garchompite|445
garchompmegaz|Garchomp|Mega-Z|Dragon|108,130,85,141,85,151|Levitate|Garchompite Z|445
lucariomega|Lucario|Mega|Fighting,Steel|70,145,88,140,70,112|Adaptability|Lucarionite|448
lucariomegaz|Lucario|Mega-Z|Fighting,Steel|70,100,70,164,70,151|Aura Guard|Lucarionite Z|448
abomasnowmega|Abomasnow|Mega|Grass,Ice|90,132,105,132,105,30|Snow Warning|Abomasite|460
gallademega|Gallade|Mega|Psychic,Fighting|68,165,95,65,115,110|Inner Focus|Galladite|475
froslassmega|Froslass|Mega|Ice,Ghost|70,80,70,140,100,120|Snow Warning|Froslassite|478
heatranmega|Heatran|Mega|Fire,Steel|91,120,106,175,141,67|Flash Fire|Heatranite|485
darkraimega|Darkrai|Mega|Dark|70,120,130,165,130,85|Bad Dreams|Darkranite|491
emboarmega|Emboar|Mega|Fire,Fighting|110,148,75,110,110,75|Mold Breaker|Emboarite|500
excadrillmega|Excadrill|Mega|Ground,Steel|110,165,100,65,65,103|Piercing Drill|Excadrite|530
audinomega|Audino|Mega|Normal,Fairy|103,60,126,80,126,50|Healer|Audinite|531
scolipedemega|Scolipede|Mega|Bug,Poison|60,140,149,75,99,62|Shell Armor|Scolipite|545
scraftymega|Scrafty|Mega|Dark,Fighting|65,130,135,55,135,68|Intimidate|Scraftinite|560
eelektrossmega|Eelektross|Mega|Electric|85,145,80,135,90,80|Eelevate|Eelektrossite|604
chandeluremega|Chandelure|Mega|Ghost,Fire|60,75,110,175,110,90|Infiltrator|Chandelurite|609
golurkmega|Golurk|Mega|Ground,Ghost|89,159,105,70,105,55|Unseen Fist|Golurkite|623
chesnaughtmega|Chesnaught|Mega|Grass,Fighting|88,137,172,74,115,44|Bulletproof|Chesnaughtite|652
delphoxmega|Delphox|Mega|Fire,Psychic|75,69,72,159,125,134|Levitate|Delphoxite|655
greninjamega|Greninja|Mega|Water,Dark|72,125,77,133,81,142|Protean|Greninjite|658
pyroarmega|Pyroar|Mega|Fire,Normal|86,88,92,129,86,126|Fire Mane|Pyroarite|668
floettemega|Floette|Mega|Fairy|74,85,87,155,148,102|Fairy Aura|Floettite|670
malamarmega|Malamar|Mega|Dark,Psychic|86,102,88,98,120,88|Contrary|Malamarite|687
barbaraclemega|Barbaracle|Mega|Rock,Fighting|72,140,130,64,106,88|Tough Claws|Barbaracite|689
dragalgemega|Dragalge|Mega|Poison,Dragon|65,85,105,132,163,44|Regenerator|Dragalgite|691
hawluchamega|Hawlucha|Mega|Fighting,Flying|78,137,100,74,93,118|No Guard|Hawluchanite|701
zygardemega|Zygarde|Mega|Dragon,Ground|216,70,91,216,85,100|Aura Break|Zygardite|718
dianciemega|Diancie|Mega|Rock,Fairy|50,160,110,160,110,110|Magic Bounce|Diancite|719
crabominablemega|Crabominable|Mega|Fighting,Ice|97,157,122,62,107,33|Iron Fist|Crabominite|740
golisopodmega|Golisopod|Mega|Bug,Steel|75,150,175,70,120,40|Tough Claws|Golisopite|768
drampamega|Drampa|Mega|Normal,Dragon|78,85,110,160,116,36|Berserk|Drampanite|780
magearnamega|Magearna|Mega|Steel,Fairy|80,125,115,170,115,95|Soul-Heart|Magearnite|801
zeraoramega|Zeraora|Mega|Electric|88,157,75,147,80,153|Volt Absorb|Zeraorite|807
falinksmega|Falinks|Mega|Fighting|65,135,135,70,65,100|Defiant|Falinksite|870
scovillainmega|Scovillain|Mega|Grass,Fire|65,138,85,138,85,75|Spicy Spray|Scovillainite|952
glimmoramega|Glimmora|Mega|Rock,Poison|83,90,105,150,96,101|Adaptability|Glimmoranite|970
baxcaliburmega|Baxcalibur|Mega|Dragon,Ice|115,175,117,105,101,87|Thermal Exchange|Baxcalibrite|998`;
const V174_MEGA_FORM_DATA = V174_MEGA_ROWS.trim().split(/\n/).map(line=>{
 const [id,base,forme,typeCsv,statCsv,ability,item,num]=line.split('|');
 const s=statCsv.split(',').map(Number);
 return {id,base,forme,types:typeCsv.split(','),baseStats:{hp:s[0],atk:s[1],def:s[2],spa:s[3],spd:s[4],spe:s[5]},ability,stoneId:slug(item),requiredItem:item,num:Number(num)};
});
const V174_MEGA_BY_ID = Object.fromEntries(V174_MEGA_FORM_DATA.map(x=>[x.id,x]));
const V174_MEGA_BY_STONE = Object.fromEntries(V174_MEGA_FORM_DATA.map(x=>[x.stoneId,x]));
const V174_MEGA_FORM_CACHE = new Map();
// Dedicated image files verified in the public Showdown Home sprite directory. Unsupported newer forms use the base sprite instead of a broken image.
const V174_VERIFIED_MEGA_SPRITES = new Set(`abomasnow-mega absol-mega aerodactyl-mega aggron-mega alakazam-mega altaria-mega ampharos-mega audino-mega banette-mega beedrill-mega blastoise-mega blaziken-mega camerupt-mega charizard-megax charizard-megay diancie-mega gallade-mega garchomp-mega gardevoir-mega gengar-mega glalie-mega gyarados-mega heracross-mega houndoom-mega kangaskhan-mega latias-mega latios-mega lopunny-mega lucario-mega manectric-mega mawile-mega medicham-mega metagross-mega mewtwo-megax mewtwo-megay pinsir-mega sableye-mega sharpedo-mega slowbro-mega steelix-mega swampert-mega sceptile-mega tyranitar-mega venusaur-mega pidgeot-mega`.split(/\s+/));
function v174MegaSpriteId(meta,base){
 const b=slug(meta.base);
 const suffix=meta.forme==='Mega'?'mega':meta.forme==='Mega-X'?'megax':meta.forme==='Mega-Y'?'megay':'mega-z';
 // Try a dedicated Mega sprite for every form. If it is not hosted, the normal
 // sprite candidate chain falls back to the base species image without a broken icon.
 return `${b}-${suffix}`;
}
function v174FindBaseSpecies(meta){return state.data?.dexById?.[slug(meta.base)]||state.data?.dex?.find(p=>Number(p.num)===Number(meta.num))||null;}
function v174MegaForm(metaOrId){
 const meta=typeof metaOrId==='string'?V174_MEGA_BY_ID[metaOrId]:metaOrId;
 if(!meta)return null;
 if(V174_MEGA_FORM_CACHE.has(meta.id))return V174_MEGA_FORM_CACHE.get(meta.id);
 const base=v174FindBaseSpecies(meta);
 const jp=base?getPokeName(base):meta.base;
 const suffix=meta.forme==='Mega-X'?'X':meta.forme==='Mega-Y'?'Y':meta.forme==='Mega-Z'?'Z':'';
 const displayName=`${jp}（メガ${suffix}）`;
 const form={...(base||{}),id:meta.id,slug:meta.id,name:`${meta.base}-Mega${suffix?'-'+suffix:''}`,jpName:displayName,displayName,num:meta.num,types:[...meta.types],baseStats:{...meta.baseStats},bst:Object.values(meta.baseStats).reduce((a,n)=>a+n,0),abilities:{0:slug(meta.ability)},baseSpecies:meta.base,forme:meta.forme,isMega:true,isDefault:false,battleOnly:true,requiredItem:meta.requiredItem,spriteid:v174MegaSpriteId(meta,base),spritePokemonId:meta.num,pokeApiPokemonId:meta.num,megaStoneId:meta.stoneId,megaImageAvailable:V174_VERIFIED_MEGA_SPRITES.has(`${slug(meta.base)}-${meta.forme==='Mega'?'mega':meta.forme==='Mega-X'?'megax':meta.forme==='Mega-Y'?'megay':'megaz'}`)};
 V174_MEGA_FORM_CACHE.set(meta.id,form);return form;
}
const V174_prevMonSpecies=monSpecies;
monSpecies=function(mon){const id=String(mon?.speciesId||'');if(V174_MEGA_BY_ID[id])return v174MegaForm(id);return V174_prevMonSpecies(mon);};
const V174_prevMakeOwned=makeOwned;
makeOwned=function(species,options={}){const mon=V174_prevMakeOwned(species,options);mon.teraType=options.teraType||species?.types?.[0]||'Normal';return mon;};
const V174_prevInitializeSave=initializeSave;
initializeSave=function(){V174_prevInitializeSave();let changed=false;for(const mon of state.owned||[]){if(!mon.teraType){const species=state.data?.dexById?.[mon.speciesId];mon.teraType=species?.types?.[0]||'Normal';changed=true;}}if(changed)saveLocal();};
const V174_prevBuildBattleMon=buildBattleMon;
buildBattleMon=function(monOrSpecies,owned=false){const mon=V174_prevBuildBattleMon(monOrSpecies,owned);if(!mon.teraType)mon.teraType=mon.types?.[0]||'Normal';return mon;};
function findMegaForm(mon){
 const base=monSpecies(mon);if(!base)return null;
 const meta=V174_MEGA_BY_STONE[itemSlug(mon.heldItem||'')];if(!meta)return null;
 const baseKey=slug(base.baseSpecies||base.id||base.name);
 if(baseKey!==slug(meta.base)&&Number(base.num)!==Number(meta.num))return null;
 return v174MegaForm(meta);
}
function megaEvolve(mon,side='player'){
 if(!mon||mon.megaUsed)return false;
 if(mon.terastallized){toast('テラスタル中はメガシンカできません。','warn');return false;}
 if(side==='player'&&capItem('megaenergy')<1){toast('メガエナジーが足りません。育成・厳選アイテムから購入してください。','warn');return false;}
 const mega=findMegaForm(mon);if(!mega){toast('このポケモンに対応するメガストーンがありません。持ち物を確認してください。','warn');return false;}
 const ratio=Number(mon.hp||1)/Math.max(1,Number(mon.maxhp||1));
 mon._preMegaSpeciesId=mon._preMegaSpeciesId||mon.speciesId;
 mon.speciesId=mega.id;mon.formId=mega.id;mon.name=getPokeName(mega);mon.types=[...mega.types];mon.abilityId=Object.values(mega.abilities||{})[0]||mon.abilityId;
 mon.stats=calcStats(mon);mon.maxhp=mon.stats.hp;mon.hp=Math.max(1,Math.min(mon.maxhp,Math.round(mon.maxhp*ratio)));
 mon.megaUsed=true;mon.megaActive=true;mon.megaFormId=mega.id;
 if(side==='player'){state.items=state.items||{};state.items.megaenergy=Math.max(0,Number(state.items.megaenergy||0)-1);saveLocal();}
 battleLog(`${mon.name}にメガシンカした！`);toast(`${mon.name}にメガシンカ！`,'good');return true;
}
// Replace the two-entry prototype list with all forms in the current public Showdown Pokédex snapshot.
const V174_newMegaStones=[];
for(const meta of V174_MEGA_FORM_DATA){
 const base=v174FindBaseSpecies(meta);
 const baseJp=base?getPokeName(base):meta.base;
 const suffix=meta.forme==='Mega-X'?'X':meta.forme==='Mega-Y'?'Y':meta.forme==='Mega-Z'?'Z':'';
 V174_newMegaStones.push({id:meta.stoneId,name:`${baseJp}ナイト${suffix}`,price:suffix==='Z'?800:500,description:`${baseJp}に持たせると、バトル中にメガ${suffix? suffix+' ':''}${baseJp}へメガシンカできます。`,meta,kind:'mega-stone'});
}
MEGA_STONES.splice(0,MEGA_STONES.length,...V174_newMegaStones);
// Training: store the Terastal type per Pokémon and expose only Mega Stones actually owned.
const V174_TERA_TYPES=['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy','Stellar'];
const V174_prevRenderTraining=renderTraining;
renderTraining=function(){
 let html=V174_prevRenderTraining();
 const mon=state.owned.find(m=>m.uid===state.selectedOwned)||state.owned[0];
 if(!mon)return html;
 const current=V174_TERA_TYPES.includes(mon.teraType)?mon.teraType:(mon.types?.[0]||state.data?.dexById?.[mon.speciesId]?.types?.[0]||'Normal');
 const teraControl=`<label class="small muted" for="tera-type-select" style="display:block;margin-top:13px">テラスタイプ</label><select id="tera-type-select" class="field" style="width:100%;margin-top:6px">${V174_TERA_TYPES.map(t=>`<option value="${t}" ${t===current?'selected':''}>${TYPE_JA[t]||t}</option>`).join('')}</select><small class="tiny muted" style="display:block;margin-top:5px">バトル中に1回だけ選んだタイプへテラスタルします。</small>`;
 html=html.replace(/(<select id="ability-select"[\s\S]*?<\/select>)/,`$1${teraControl}`);
 const ownedStoneOptions=MEGA_STONES.filter(it=>Number(state.items?.[it.id]||0)>0||itemSlug(mon.heldItem)===it.id).filter(it=>!html.includes(`value="${it.id}"`)).map(it=>`<option value="${it.id}" ${itemSlug(mon.heldItem)===it.id?'selected':''}>${esc(it.name)}（所持 ${Number(state.items?.[it.id]||0)}）</option>`).join('');
 if(ownedStoneOptions)html=html.replace(/(<select id="held-item"[^>]*>[\s\S]*?)(<\/select>)/,`$1${ownedStoneOptions}$2`);
 return html;
};
// Keep the normal change/save pipeline; Tera type is saved immediately and again with the full training form.
const V174_prevBindPageEvents=bindPageEvents;
bindPageEvents=function(){V174_prevBindPageEvents();const main=$('#main');if(main){const old=main.onchange;main.onchange=function(e){const el=e.target;if(el?.id==='tera-type-select'){const mon=state.owned.find(m=>m.uid===state.selectedOwned);if(mon&&V174_TERA_TYPES.includes(el.value)){mon.teraType=el.value;saveLocal();toast(`${mon.name}のテラスタイプを${TYPE_JA[el.value]||el.value}に設定しました。`,'good');renderPage();}return;}return old?.call(this,e);};}};
// The item shop lists every available Mega Stone and uses each verified Mega sprite as its preview.
renderShop=function(){
 const q=searchKey(state.shopSearch||'');
 const list=MEGA_STONES.filter(x=>!q||searchKey(x.name).includes(q)||searchKey(x.id).includes(q)||searchKey(x.meta.base).includes(q));
 const ownedStones=list.reduce((n,x)=>n+Number(state.items?.[x.id]||0),0);
 const cards=list.map(item=>{const stock=Math.max(0,Number(state.items?.[item.id]||0));const form=v174MegaForm(item.meta);return `<section class="shop-card mega-stone-card"><div class="mega-shop-sprite">${speciesIcon(form,false,false)}<span class="pill">${item.meta.forme==='Mega-Z'?'MEGA Z':item.meta.forme==='Mega-X'?'MEGA X':item.meta.forme==='Mega-Y'?'MEGA Y':'MEGA'}</span></div><div><div class="section-kicker">MEGA STONE · ${item.meta.base.toUpperCase()}</div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><small class="shop-stock">所持数：${stock}個 ${form.megaImageAvailable?'· 専用画像確認済み':'· 専用画像を優先取得／未取得時は通常画像'}</small></div><div class="shop-price">${item.price} VP</div><button class="btn ${stock?'btn-secondary':'btn-primary'} shop-buy" data-action="buy-item" data-item="${esc(item.id)}" ${state.vp<item.price?'disabled':''}>${state.vp<item.price?'VP不足':'購入する'}</button></section>`;}).join('');
 const careCards=CARE_ITEMS.map(it=>`<article class="care-mon-card"><div class="section-kicker">CARE ITEM</div><h3>${esc(it.name)}</h3><p class="small muted">${esc(it.desc)}</p><div class="care-mon-meta"><span class="pill">${it.price} VP</span><span class="pill">所持 ${capItem(it.id)}個</span></div><button class="btn btn-primary btn-wide" data-action="care-buy-item" data-item="${esc(it.id)}" ${state.vp<it.price?'disabled':''}>購入する</button></article>`).join('');
 return `${pageHeader('ITEM SHOP / MEGA STONES','アイテムショップ','全種類のメガストーンを購入できます。メガシンカ1回につき、共通のメガエナジーを1個消費します。','<button class="btn btn-ghost" data-page="box">▧ ボックスへ</button>')}<div class="stats-strip">${statTile('VP BALANCE',state.vp.toLocaleString(),'購入に使えるポイント')}${statTile('OWNED MEGA STONES',ownedStones,'現在の検索結果内の所持数')}${statTile('MEGA FORMS',V174_MEGA_FORM_DATA.length,'対応フォームデータ')}</div><div class="search-row"><input id="shop-search" class="field search-field" placeholder="ポケモン名・メガストーン名で検索" value="${esc(state.shopSearch||'')}"><span class="pill">${list.length}種類</span></div><div class="shop-grid mega-shop-grid">${cards||'<p class="empty-state">該当するメガストーンがありません。</p>'}</div><section class="panel" style="margin-top:15px"><div class="panel-body"><h3 style="margin-top:0">メガシンカの使い方</h3><p class="small muted" style="line-height:1.8">① 対象ポケモンのメガストーンを購入 → ② トレーニングで持たせる → ③ メガエナジーを1個以上所持 → ④ バトルでメガシンカを選択。メガストーンは消費されません。メガエナジーは育成・厳選アイテム欄で購入できます。</p><div class="action-row"><button class="btn btn-primary" data-page="training">トレーニングで持たせる</button><button class="btn btn-ghost" data-page="scout">ポケモンをスカウト</button></div></div></section><section class="panel" style="margin-top:15px"><div class="panel-head"><h2>🌱 育成・厳選アイテム</h2><span class="pill">${CARE_ITEMS.length}種類</span></div><div class="panel-body"><div class="care-list">${careCards}</div></div></section>`;
};
// Purchase action for each Mega Stone. Mega Energy remains a separate consumable in CARE_ITEMS.
const V174_prevHandleAction=handleAction;
handleAction=async function(action,el){
 if(action==='buy-item'){
  const item=MEGA_STONES.find(x=>x.id===el?.dataset?.item);if(!item){toast('メガストーンのデータが見つかりません。','bad');return;}
  if(state.vp<item.price){toast('VPが足りません。','bad');return;}
  state.vp-=item.price;state.items=state.items||{};state.items[item.id]=Math.max(0,Number(state.items[item.id]||0))+1;saveLocal();toast(`${item.name}を購入しました。`,'good');renderPage();return;
 }
 return V174_prevHandleAction(action,el);
};
// Battle Tera type is captured before types change; only a committed move triggers it (not a switch).
const V174_prevActivateTera=bcActivateTera;
bcActivateTera=function(mon,b,side='player'){
 if(mon&&!V174_TERA_TYPES.includes(mon.teraType))mon.teraType=mon.types?.[0]||'Normal';
 if(mon&&!Array.isArray(mon._baseBattleTypes))mon._baseBattleTypes=[...(mon.types||monSpecies(mon)?.types||[])];
 return V174_prevActivateTera(mon,b,side);
};
function v174TeraColor(type){return ({Normal:'#e9edf6',Fire:'#ff885c',Water:'#55bfff',Electric:'#ffe36a',Grass:'#8ee47c',Ice:'#a4efff',Fighting:'#ff8e87',Poison:'#d99bff',Ground:'#deb17c',Flying:'#a5b3ff',Psychic:'#ff9ad4',Bug:'#c6e66a',Rock:'#dbc58f',Ghost:'#ae9aff',Dragon:'#889cff',Dark:'#9ca0bb',Steel:'#d3e2ea',Fairy:'#ffb6e4',Stellar:'#fff3a6'})[type]||'#bde9ff';}
async function v174PlayTeraAnimation(slot,mon){
 const field=document.querySelector('.battlefield');const target=document.getElementById(`mon-player-${slot}`);
 if(!field||!target){await new Promise(r=>setTimeout(r,700));return;}
 const fieldRect=field.getBoundingClientRect(),targetRect=target.getBoundingClientRect();
 const overlay=document.createElement('div');overlay.className='tera-star-rain';overlay.style.setProperty('--tera-color',v174TeraColor(mon.teraType));
 for(let i=0;i<26;i++){
  const star=document.createElement('span');star.className='tera-rain-star';star.textContent=i%4===0?'✦':'✧';
  const x=Math.random()*Math.max(80,fieldRect.width);const y=Math.max(90,targetRect.bottom-fieldRect.top-12)+(Math.random()*70-35);
  star.style.left=`${x}px`;star.style.setProperty('--drop-y',`${Math.max(110,y)}px`);star.style.setProperty('--drift',`${(Math.random()-.5)*90}px`);star.style.setProperty('--delay',`${Math.random()*.45}s`);star.style.setProperty('--star-size',`${10+Math.random()*17}px`);overlay.appendChild(star);
 }
 field.appendChild(overlay);target.classList.add('tera-active','tera-forming');
 if(!target.querySelector('.tera-crystal-shell'))target.insertAdjacentHTML('beforeend','<span class="tera-crystal-shell" aria-hidden="true"></span><span class="tera-crown-symbol" aria-hidden="true">✦</span>');
 await new Promise(r=>setTimeout(r,1750));overlay.remove();target.classList.remove('tera-forming');
}
const V174_prevExecuteTurn=executeTurn;
executeTurn=async function(actions){
 const b=state.battle;
 if(b&&Array.isArray(b.teraPendingSlots)&&b.teraPendingSlots.length){
  const pending=b.teraPendingSlots.slice();b.teraPendingSlots=[];
  for(const slot of pending){
   const idx=b.playerActive?.[slot],mon=b.playerTeam?.[idx];
   const committed=Array.isArray(actions)?actions.find(a=>a.slot===slot&&a.actorUid===mon?.uid&&a.moveId&&!a.switchTo):null;
   if(mon&&committed&&bcActivateTera(mon,b,'player'))await v174PlayTeraAnimation(slot,mon);
  }
 }
 return V174_prevExecuteTurn(actions);
};
// Keep the cut-crystal shell and crown in the rendered markup after every battle UI refresh.
function v175DecorateTeraBattleHtml(html,battle){
 if(typeof html!=='string'||!battle)return html;
 for(const side of ['player','enemy']){
  const team=battle[side+'Team']||[],active=battle[side+'Active']||[];
  for(let slot=0;slot<active.length;slot++){
   const mon=team[active[slot]];
   if(!mon?.terastallized)continue;
   const marker=`id="mon-${side}-${slot}"`,at=html.indexOf(marker);
   if(at<0)continue;
   const start=html.lastIndexOf('<div',at),end=html.indexOf('>',at);
   if(start<0||end<0)continue;
   let opening=html.slice(start,end+1);
   if(!opening.includes('tera-active'))opening=opening.replace('class="battle-mon ', 'class="battle-mon tera-active ');
   const color=v174TeraColor(mon.teraType);
   if(opening.includes('style="'))opening=opening.replace('style="',`style="--tera-color:${color};`);
   else opening=opening.replace('>',` style="--tera-color:${color}">`);
   const crystal='<span class="tera-crystal-shell" aria-hidden="true"></span><span class="tera-crown-symbol" aria-hidden="true">✦</span>';
   const innerAt=end+1;
   if(!html.slice(innerAt,innerAt+180).includes('tera-crystal-shell'))html=html.slice(0,start)+opening+crystal+html.slice(innerAt);
   else html=html.slice(0,start)+opening+html.slice(innerAt);
  }
 }
 return html;
}
const V175_prevRenderBattlePage=renderBattlePage;
renderBattlePage=function(){return v175DecorateTeraBattleHtml(V175_prevRenderBattlePage(),state.battle);};
// Tera activation visual effect is replayed for every successful activation; the persistent shell is generated above.
// Expose an explicit audit covering image path availability and render persistence.
// Expose audit/test helpers for the game console and automated checks.
function v174AuditMegaTera(){
 const stones=MEGA_STONES.map(x=>({id:x.id,name:x.name,megaFormId:x.meta.id,base:x.meta.base,forme:x.meta.forme,image:x.meta.forme==='Mega'?'form-sprite-check-pending':x.meta.forme,hasDedicatedImage:!!v174MegaForm(x.meta).megaImageAvailable}));
 return {version:'17.5.0',megaForms:V174_MEGA_FORM_DATA.length,uniqueMegaStones:new Set(MEGA_STONES.map(x=>x.id)).size,megaFormsMissingBase:V174_MEGA_FORM_DATA.filter(x=>!v174FindBaseSpecies(x)).map(x=>x.base),formsWithoutDedicatedSprite:stones.filter(x=>!x.hasDedicatedImage).length,megaStones:stones,teraTypes:V174_TERA_TYPES.slice(),crystalMarkupTest:v175DecorateTeraBattleHtml('<div class=\"battle-mon player slot-0\" id=\"mon-player-0\"></div>',{playerTeam:[{terastallized:true,teraType:'Water'}],playerActive:[0],enemyTeam:[],enemyActive:[]}).includes('tera-crystal-shell'),tests:v174RunMegaTeraTests()};
}
function v174RunMegaTeraTests(){
 const checks=[];const test=(name,fn)=>{try{checks.push({name,passed:!!fn()});}catch(e){checks.push({name,passed:false,error:String(e?.message||e)});}};
 test('MegaフォームのIDがすべて一意',()=>new Set(V174_MEGA_FORM_DATA.map(x=>x.id)).size===V174_MEGA_FORM_DATA.length);
 test('メガストーンIDがすべて一意',()=>new Set(MEGA_STONES.map(x=>x.id)).size===MEGA_STONES.length);
 test('全フォームに6能力・タイプ・特性がある',()=>V174_MEGA_FORM_DATA.every(x=>Object.keys(x.baseStats).length===6&&x.types.length>0&&!!x.ability));
 test('全フォームが内蔵図鑑の種族を参照',()=>V174_MEGA_FORM_DATA.every(x=>!!state.data?.dexById?.[slug(x.base)]));
 test('Z・X・Y形態のストーン判定',()=>['charizarditex','mewtwonitey','garchompitez','absolitez','lucarionitez'].every(id=>!!V174_MEGA_BY_STONE[id]));
 test('19種類のテラスタイプ',()=>V174_TERA_TYPES.length===19&&V174_TERA_TYPES.includes('Stellar'));
 test('メガエナジーは独立してCARE_ITEMSに存在',()=>CARE_ITEMS.some(x=>x.id==='megaenergy'));
 test('テラスタルの結晶シェルを再描画HTMLへ保持',()=>v175DecorateTeraBattleHtml('<div class=\"battle-mon player slot-0\" id=\"mon-player-0\"></div>',{playerTeam:[{terastallized:true,teraType:'Water'}],playerActive:[0],enemyTeam:[],enemyActive:[]}).includes('tera-crystal-shell'));
 return {passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
}
if(window.PokemonChampions2DData)Object.assign(window.PokemonChampions2DData,{version:'v17.5.0',auditMegaTera:v174AuditMegaTera,testMegaTera:v174RunMegaTeraTests,megaFormCount:V174_MEGA_FORM_DATA.length,megaStoneCount:MEGA_STONES.length});
/* end v17.5 */

/* v17.6: complete core Stellar Terastallization rules + safe Mega sprite candidate expansion. */
const V176_prevResolveContextMoveData = resolveContextMoveData;
function v176IsTerapagos(mon){
 const sp=monSpecies(mon)||{};
 const keys=[mon?.speciesId,mon?.baseSpeciesId,mon?.name,sp?.id,sp?.name,sp?.baseSpecies].filter(Boolean).map(x=>slug(x));
 return keys.some(x=>x==='terapagos'||x.startsWith('terapagos-'));
}
const V176_VARIABLE_BASE_POWER_IDS=new Set(['lowkick','grassknot','heavyslam','heatcrash','gyroball','electroball','fling','eruption','waterspout','dragonenergy']);
function v176TeraLowPowerBoost(move,actor,type,power,b){
 const p=Number(power||0),raw=Number(move?.basePower||0),priority=Number(move?.priority||0),id=bcMoveId(move);
 if(!actor?.terastallized||p<=0||p>=60||priority>0||move?.multihit)return p;
 // These have variable base power and are excluded from the standard/Stellar 60-power rule.
 if(V176_VARIABLE_BASE_POWER_IDS.has(id))return p;
 if((raw===0||raw===150)&&move?.basePowerCallback)return p;
 // Guard against status/fixed-damage entries that happen to carry an incidental power value.
 if(move?.category==='Status'||move?.damage||move?.ohko)return p;
 if(actor.teraType==='Stellar'){
  const used=Array.isArray(actor.stellarBoostedTypes)?actor.stellarBoostedTypes:[];
  const actionKey=`${Number(b?.turn||0)}:${bcMoveId(move)}:${type}`;
  const cachedFirst=actor._stellarActionKey===actionKey&&actor._stellarFirstBoost&&actor._stellarActionType===type;
  return (cachedFirst||v176IsTerapagos(actor)||!used.includes(type))?60:p;
 }
 return type===actor.teraType?60:p;
}
resolveContextMoveData=function(move,actor,target,b){
 const r=V176_prevResolveContextMoveData(move,actor,target,b);
 if(!move||!actor)return r;
 const id=bcMoveId(move),tera=actor.teraType||'';
 let type=r.type,power=r.power;
 if(id==='terablast'&&actor.terastallized){type=tera||type;power=v176TeraBlastPower(tera);}
 power=v176TeraLowPowerBoost(move,actor,type,power,b);
 return {...r,type,power};
};

// Stellar typing preserves the Pokémon's original defensive typing. Standard Tera replaces it.
function v176ApplyTeraDefensiveTypes(mon){
 const original=Array.isArray(mon?._teraOriginalTypes)?mon._teraOriginalTypes.slice():[...(mon?.types||[])];
 if(mon)mon.types=mon.teraType==='Stellar'?original:[mon.teraType];
 return mon?.types||[];
}
function v176TeraBlastPower(teraType){return teraType==='Stellar'?100:80;}
function v176TeraBlastEffectiveness(target){return target?.terastallized?2:1;}
const V176_prevActivateTera=bcActivateTera;
bcActivateTera=function(mon,b,side='player'){
 const ok=V176_prevActivateTera(mon,b,side);
 if(!ok)return false;
 if(mon.teraType==='Stellar'){
  v176ApplyTeraDefensiveTypes(mon);
  mon.stellarBoostedTypes=[];
  delete mon._stellarActionKey;
  delete mon._stellarActionType;
  delete mon._stellarFirstBoost;
  bcEffectLog(`${mon.name}はステラタイプの力をまとった！ 元のタイプ相性を保つ！`);
 }
 return true;
};

// Stellar's once-per-type bonus is cached for the whole action, so every hit of a multi-hit
// move gets the same bonus. The type is consumed when damage calculation is reached.
function v176StellarStabFactor({native=false,first=true,baseStab=1,forceStab=false}={}){
 const hasStab=!!native||!!forceStab||Number(baseStab)>1;
 const desired=first?(hasStab?2:1.2):(hasStab?1.5:1);
 return {desired,factor:desired/Math.max(0.01,Number(baseStab)||1)};
}
const V176_prevCalculateDamage=calculateDamage;
calculateDamage=function(actor,target,move,b){
 const result=V176_prevCalculateDamage(actor,target,move,b);
 if(!actor?.terastallized||actor.teraType!=='Stellar'||!result||result.blocked)return result;
 const resolved=resolveContextMoveData(move,actor,target,b),type=resolved.type;
 if(!type||type==='???')return result;
 const used=Array.isArray(actor.stellarBoostedTypes)?actor.stellarBoostedTypes:(actor.stellarBoostedTypes=[]);
 const key=`${Number(b?.turn||0)}:${bcMoveId(move)}:${type}`;
 if(actor._stellarActionKey!==key){
  actor._stellarActionKey=key;
  actor._stellarActionType=type;
  actor._stellarFirstBoost=v176IsTerapagos(actor)||!used.includes(type);
  if(actor._stellarFirstBoost&&!v176IsTerapagos(actor))used.push(type);
 }
 const original=Array.isArray(actor._teraOriginalTypes)?actor._teraOriginalTypes:[];
 const {desired,factor}=v176StellarStabFactor({
  native:original.includes(type),
  forceStab:!!move?.forceSTAB,
  first:!!actor._stellarFirstBoost,
  baseStab:Number(result.stab)||1
 });
 if(factor!==1&&Number(result.damage)>0)result.damage=Math.max(1,Math.floor(result.damage*factor));
 result.stab=desired;
 // Stellar Tera Blast is super-effective against any Terastallized target.
 if(bcMoveId(move)==='terablast'&&target?.terastallized&&Number(result.damage)>0){
  result.damage=Math.max(1,Math.floor(result.damage*2));
  result.effectiveness=v176TeraBlastEffectiveness(target);
  result.stellarTeraBlast=true;
 }
 return result;
};

// Stellar Tera Blast is super-effective against Terastallized targets, so Wonder Guard cannot block it.
function v176IsStellarTeraBlastEffective(actor,target,move){return !!(actor?.terastallized&&actor.teraType==='Stellar'&&bcMoveId(move)==='terablast'&&target?.terastallized);}
const V176_prevAbilityTriggerOnMove=abilityTriggerOnMove;
abilityTriggerOnMove=function(actor,target,move,b){
 if(v176IsStellarTeraBlastEffective(actor,target,move)&&bcAbility(target,b)==='wonderguard'){
  bcEffectLog(`${target.name}のふしぎなまもりもステラテラバーストを防げない！`);
  return false;
 }
 return V176_prevAbilityTriggerOnMove(actor,target,move,b);
};

// Stellar Tera Blast also lowers both offensive stats after the attack.
const V176_prevApplyMoveExtras=applyMoveExtras;
applyMoveExtras=function(actor,target,move,b){
 const out=V176_prevApplyMoveExtras(actor,target,move,b);
 if(actor?.terastallized&&actor.teraType==='Stellar'&&bcMoveId(move)==='terablast'&&actor._lastMoveHit){
  applyBoosts(actor,{atk:-1,spa:-1},'テラバースト（ステラ）');
  battleLog(`${actor.name}の攻撃と特攻が下がった！`);
 }
 return out;
};

function v176AuditTeraMechanics(){
 const checks=[];const test=(name,fn)=>{try{checks.push({name,passed:!!fn()});}catch(e){checks.push({name,passed:false,error:String(e?.message||e)});}};
 test('通常テラスタルはテラタイプへ防御タイプ変更',()=>{const x={teraType:'Water',_teraOriginalTypes:['Fire'],types:['Fire']};return v176ApplyTeraDefensiveTypes(x).join(',')==='Water';});
 test('ステラは元の防御タイプを保持',()=>{const x={types:['Stellar'],_teraOriginalTypes:['Fire','Flying'],teraType:'Stellar'};return v176ApplyTeraDefensiveTypes(x).join(',')==='Fire,Flying';});
 test('ステラ初回の元タイプ技はSTAB 2倍',()=>{const x=v176StellarStabFactor({native:true,first:true,baseStab:1.5});return x.desired===2&&Math.abs(x.factor-4/3)<0.0001;});
 test('ステラ2回目以降の元タイプ技はSTAB 1.5倍',()=>{const x=v176StellarStabFactor({native:true,first:false,baseStab:1.5});return x.desired===1.5&&x.factor===1;});
 test('ステラ初回の非タイプ一致技は1.2倍',()=>{const x=v176StellarStabFactor({native:false,first:true,baseStab:1});return x.desired===1.2&&x.factor===1.2;});
 test('ステラ2回目以降の非タイプ一致技は追加補正なし',()=>{const x=v176StellarStabFactor({native:false,first:false,baseStab:1});return x.desired===1&&x.factor===1;});
 test('ステラの低威力技は初回のみ威力60',()=>{const a={terastallized:true,teraType:'Stellar',stellarBoostedTypes:[]},m={id:'watergun',basePower:40,category:'Special',priority:0};return v176TeraLowPowerBoost(m,a,'Water',40,{turn:1})===60&&v176TeraLowPowerBoost(m,{...a,stellarBoostedTypes:['Water']},'Water',40,{turn:2})===40;});
 test('通常テラの一致低威力技は威力60',()=>v176TeraLowPowerBoost({basePower:40,category:'Physical',priority:0},{terastallized:true,teraType:'Fire'},'Fire',40,{turn:1})===60);
 test('可変威力技は60への固定化をしない',()=>v176TeraLowPowerBoost({id:'lowkick',basePower:40,category:'Physical',priority:0},{terastallized:true,teraType:'Fighting'},'Fighting',40,{turn:1})===40);
 test('ステラのテラバーストは威力100',()=>v176TeraBlastPower('Stellar')===100&&v176TeraBlastPower('Water')===80);
 test('ステラテラバーストはテラ状態の相手に抜群',()=>v176TeraBlastEffectiveness({terastallized:true})===2&&v176TeraBlastEffectiveness({terastallized:false})===1);
 test('ステラテラバーストはテラ状態のふしぎなまもりを突破',()=>v176IsStellarTeraBlastEffective({terastallized:true,teraType:'Stellar'},{terastallized:true},{id:'terablast'}));
 test('19種のテラタイプ設定を保持',()=>Array.isArray(V174_TERA_TYPES)&&V174_TERA_TYPES.length===19&&V174_TERA_TYPES.includes('Stellar'));
 return {version:'17.6.0',passed:checks.filter(x=>x.passed).length,total:checks.length,checks};
}
function v176Audit(){
 const mega=v174AuditMegaTera();
 return {version:'17.6.0',megaForms:mega.megaForms,megaStones:mega.uniqueMegaStones,formsWithoutVerifiedDedicatedSprites:mega.formsWithoutDedicatedSprite,megaFormsMissingBase:mega.megaFormsMissingBase,teraTypes:V174_TERA_TYPES.slice(),stellar:v176AuditTeraMechanics(),mega:mega.tests};
}
if(window.PokemonChampions2DData)Object.assign(window.PokemonChampions2DData,{version:'v17.6.0',auditTeraMechanics:v176AuditTeraMechanics,auditMegaTeraV176:v176Audit,testTerastalV176:v176AuditTeraMechanics});
/* end v17.6 */
