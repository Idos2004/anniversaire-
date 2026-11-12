/*! Éclat — moteur narratif. Transforme des souvenirs en scènes, sans formules toutes faites. */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ données */

  const RELATIONS = {
    ami: { group: 'friend', chip: 'Un·e ami·e' },
    meilleur: { group: 'best', chip: 'Meilleur·e ami·e' },
    amour: { group: 'love', chip: 'Mon amour' },
    mere: { group: 'parent', chip: 'Ma mère', g: 'f', call: 'Maman' },
    pere: { group: 'parent', chip: 'Mon père', g: 'm', call: 'Papa' },
    frere: { group: 'sibling', chip: 'Mon frère', g: 'm' },
    soeur: { group: 'sibling', chip: 'Ma sœur', g: 'f' },
    enfant: { group: 'child', chip: 'Mon enfant' },
    grandparent: { group: 'elder', chip: 'Grand-parent', call: ['Papi', 'Mamie'] },
    collegue: { group: 'work', chip: 'Collègue' },
    autre: { group: 'other', chip: 'Quelqu’un de cher' }
  };

  // [masculin, féminin, image concrète (2e pers. sans sujet)]
  const QUALITIES = {
    genereux: ['généreux', 'généreuse', 'donnes sans compter, même quand personne ne regarde'],
    drole: ['drôle', 'drôle', 'transformes les pires journées en fous rires'],
    loyal: ['loyal', 'loyale', 'es là, toujours, même quand c’est compliqué'],
    courageux: ['courageux', 'courageuse', 'avances même quand tu as peur'],
    doux: ['doux', 'douce', 'sais apaiser n’importe quelle tempête avec trois fois rien'],
    fort: ['fort', 'forte', 'te relèves à chaque fois, plus solide qu’avant'],
    attentionne: ['attentionné', 'attentionnée', 'te souviens des petits détails que tout le monde oublie'],
    solaire: ['solaire', 'solaire', 'illumines une pièce rien qu’en y entrant'],
    reveur: ['rêveur', 'rêveuse', 'crois encore aux grands rêves et donnes envie aux autres d’y croire'],
    sage: ['sage', 'sage', 'trouves toujours les mots justes au bon moment'],
    patient: ['patient', 'patiente', 'prends le temps d’écouter vraiment'],
    passionne: ['passionné', 'passionnée', 'mets ton cœur entier dans tout ce que tu fais'],
    protecteur: ['protecteur', 'protectrice', 'veilles sur les autres sans jamais rien demander'],
    tetu: ['têtu', 'têtue', 'ne lâches jamais rien, et c’est souvent ce qui te fait gagner'],
    authentique: ['authentique', 'authentique', 'restes toi-même, peu importe ce qu’on en pense'],
    travailleur: ['travailleur', 'travailleuse', 'construis tes rêves pierre après pierre, sans jamais tricher']
  };

  const STYLES = {
    lettre: { name: 'Lettre à cœur ouvert', mood: 'Tendre et sincère', desc: 'Une vraie lettre, qui se lit lentement, comme à voix basse.' },
    souvenirs: { name: 'Album de souvenirs', mood: 'Nostalgique', desc: 'Vos moments, page après page, comme un album qu’on feuillette ensemble.' },
    secret: { name: 'Le grand secret', mood: 'Mystérieux', desc: 'Des confidences, un compte à rebours, puis l’éclat. Pour surprendre vraiment.' },
    toast: { name: 'Le toast', mood: 'Festif et drôle', desc: 'Un discours qui fait rire avant d’émouvoir. Verres levés !' }
  };

  const LABELS = {
    intro: 'Ouverture', memory: 'Le souvenir', joke: 'Rien qu’à vous', portrait: 'Son portrait',
    photo: 'Photo', thanks: 'Le merci', wish: 'Le vœu', reveal: 'Joyeux anniversaire',
    secret: 'La surprise finale', closing: 'Le mot de la fin', teaser: 'Le mystère',
    fact: 'Confidence', countdown: 'Compte à rebours'
  };

  const AGE_WORDS = { 18: 'Dix-huit', 20: 'Vingt', 30: 'Trente', 40: 'Quarante', 50: 'Cinquante', 60: 'Soixante', 70: 'Soixante-dix', 80: 'Quatre-vingts', 90: 'Quatre-vingt-dix', 100: 'Cent' };
  const COUNT_WORDS = ['', 'Une', 'Deux', 'Trois', 'Quatre'];

  /* ------------------------------------------------------------- utilitaires */

  const APOS = /'/g;
  const COMMON = new Set(('le la les l ce cet cette ces un une des du de d ton ta tes mon ma mes notre nos votre vos leur leurs ' +
    'toute toutes tous tout chaque celui celle ceux celles quelques que qu quand lorsque pour avec sans on je j tu t il elle nous ' +
    'vous ils elles avoir être beaucoup plein mille encore autant plus moins toujours jamais enfin m s c me te se ça cela').split(' '));
  const NP_START = /^(?:l’|(?:le|la|les|ce|cet|cette|ces|un|une|des|du|ton|ta|tes|mon|ma|mes|notre|nos|votre|vos|leur|leurs|toute|toutes|tous|tout|chaque|celui|celle|ceux|celles|quelques)\s)/i;
  const VERB_EXCEPT = new Set(('plaisir désir avenir souvenir loisir élixir saphir hiver super mer fer cher enfer hier amer cancer ' +
    'master dîner déjeuner goûter souper dossier métier premier dernier entier foyer loyer papier quartier sentier janvier février ' +
    'atelier danger cahier collier soir espoir miroir devoir trottoir manoir').split(' '));
  const VERB_RE = new Set(('être faire vivre prendre apprendre reprendre comprendre surprendre écrire lire construire dire croire ' +
    'mettre suivre attendre rejoindre atteindre vaincre connaître reconnaître naître renaître paraître plaire rire sourire ' +
    'avoir voir revoir recevoir pouvoir vouloir savoir émouvoir').split(' '));

  function clean(s) {
    return String(s == null ? '' : s)
      .replace(APOS, '’')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[«"“‘\s]+/, '')
      .replace(/[»"”\s]+$/, '')
      .replace(/[\s.!?…;,:]+$/, '')
      .trim();
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const firstWord = s => (s.toLowerCase().match(/^[a-zà-ÿœæ]+/) || [''])[0];
  function lowerFirst(s) {
    return COMMON.has(firstWord(s)) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }
  const startsVowel = s => /^[aeiouyhàâäéèêëîïôöûüœæ]/i.test(s);
  function a(s) {
    if (/^le\s/i.test(s)) return 'au ' + s.slice(3);
    if (/^les\s/i.test(s)) return 'aux ' + s.slice(4);
    return 'à ' + s;
  }
  function de(s) {
    if (/^le\s/i.test(s)) return 'du ' + s.slice(3);
    if (/^les\s/i.test(s)) return 'des ' + s.slice(4);
    if (/^des\s/i.test(s)) return s;
    return startsVowel(s) ? 'd’' + s : 'de ' + s;
  }
  function join(list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + ' et ' + list[list.length - 1];
  }
  function sentence(s) {
    s = cap(s.trim());
    return /[.!?…]$/.test(s) ? s : s + '.';
  }
  // Espaces insécables de la typographie française.
  function typo(s) {
    return String(s)
      .replace(APOS, '’')
      .replace(/[  ]*([:;!?»])/g, (m, p, i, str) => (p === ':' && /\d$/.test(str.slice(0, i)) ? p : ' ' + p))
      .replace(/«[  ]*/g, '« ')
      .replace(/[ \t]{2,}/g, ' ');
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------------------------------------------------------- normalisation */

  function normMemory(raw) {
    let s = clean(raw);
    if (!s) return null;
    const m = s.match(/^(?:je (?:repense|pense)(?: (?:souvent|encore|toujours))*(?: encore)? (à|au|aux)\s+|je me (?:souviens|rappelle)(?: (?:encore|toujours))* (de|du|des|d’)\s*|tu te souviens (de|du|des|d’)\s*|te souviens-tu (de|du|des|d’)\s*)/i);
    if (m) {
      const prep = (m[1] || m[2] || m[3] || m[4] || '').toLowerCase();
      s = s.slice(m[0].length);
      if (prep === 'au' || prep === 'du') s = 'le ' + s;
      else if (prep === 'aux' || prep === 'des') s = 'les ' + s;
    }
    if (!s) return null;
    if (NP_START.test(s)) return { mode: 'np', text: lowerFirst(s) };
    return { mode: 's', text: sentence(s) };
  }

  function normAdmire(raw) {
    let s = clean(raw);
    s = s.replace(/^(?:ce que j’admire(?: le plus)?(?: chez toi)?,? c’est\s*|j’admire(?: chez toi)?\s*|c’est\s*)/i, '');
    if (!s) return '';
    if (/^(?:tu\s|t’)/i.test(s)) return 'que ' + s.charAt(0).toLowerCase() + s.slice(1);
    return lowerFirst(s);
  }

  function normThanks(raw) {
    let s = clean(raw).replace(/^merci(?: beaucoup| mille fois| infiniment)?,?\s*/i, '');
    if (!s) return '';
    s = lowerFirst(s);
    if (/^(?:pour\s|de\s|d’)/i.test(s)) return s.charAt(0).toLowerCase() + s.slice(1);
    if (/^(?:avoir|être|m’|t’|me\s|toujours m’)/i.test(s)) return de(s);
    return 'pour ' + s;
  }

  function isInfinitive(s) {
    if (/^(?:t’|te\s|s’|se\s)/i.test(s)) return true;
    const w = firstWord(s);
    if (w.length < 4 || VERB_EXCEPT.has(w)) return false;
    if (VERB_RE.has(w)) return true;
    return /(?:er|ir)$/.test(w);
  }

  function normWish(raw) {
    let s = clean(raw)
      .replace(/^(?:cette (?:nouvelle )?année|pour (?:cette|ta) (?:nouvelle )?année|pour tes \d+ ans|pour ton anniversaire),?\s*/i, '')
      .replace(/^(?:je te souhaite|j’te souhaite|je souhaite)\s*/i, '');
    if (!s) return '';
    if (/^(?:que|qu’)/i.test(s)) return s.charAt(0).toLowerCase() + s.slice(1);
    if (isInfinitive(s)) return de(s.charAt(0).toLowerCase() + s.slice(1));
    return lowerFirst(s);
  }

  /* -------------------------------------------------------------- contexte */

  function context(ans) {
    const A = ans || {};
    const rel = RELATIONS[A.rel] ? A.rel : 'autre';
    const R = RELATIONS[rel];
    const g = R.g || (A.g === 'm' ? 'm' : 'f');
    const fg = A.fg === 'm' || A.fg === 'f' ? A.fg : '';
    const age = parseInt(A.age, 10);
    const years = parseInt(A.years, 10);
    const quals = (Array.isArray(A.qualities) ? A.qualities : []).filter(k => QUALITIES[k]).slice(0, 3);
    const photos = (Array.isArray(A.photos) ? A.photos : []).slice(0, 3).map(p => ({ cap: clean(p && p.cap) }));
    return {
      rel, group: R.group, g, fg,
      to: cap(clean(A.to)) || 'toi',
      from: cap(clean(A.from)),
      age: age >= 1 && age <= 120 ? age : null,
      years: years >= 1 && years <= 99 && /^(friend|best|love|work|other)$/.test(R.group) ? years : null,
      memory: normMemory(A.memory),
      admire: normAdmire(A.admire),
      thanks: normThanks(A.thanks),
      joke: clean(A.joke),
      wish: normWish(A.wish),
      secret: String(A.secret || '').replace(APOS, '’').trim(),
      quals, photos,
      seed: clean(A.to) + '|' + clean(A.from)
    };
  }

  const G = (c, m, f) => (c.g === 'f' ? f : m);
  const F = (c, m, f, n) => (c.fg === 'm' ? m : c.fg === 'f' ? f : n);
  const adjs = c => c.quals.map(k => QUALITIES[k][c.g === 'f' ? 1 : 0]);
  const imgs = c => c.quals.map(k => QUALITIES[k][2]);

  function choose(c, v, type, list) {
    const opts = list.filter(Boolean);
    if (!opts.length) return '';
    const i = (hash(c.seed + type) + (v[type] || 0)) % opts.length;
    const o = opts[i];
    return typeof o === 'function' ? o() : o;
  }

  function scene(t, title, x, extra) {
    return Object.assign({ t, title: typo(title || ''), x: typo(x || ''), p: -1 }, extra || {});
  }

  // Photos restantes (la première accompagne le souvenir quand il existe).
  function photoScenes(c, from) {
    const out = [];
    for (let i = from; i < c.photos.length; i++) out.push(scene('photo', '', '', { p: i }));
    return out;
  }
  const memPhoto = c => (c.memory && c.photos.length ? 0 : -1);
  const restFrom = c => (c.memory && c.photos.length ? 1 : 0);

  /* ------------------------------------------------- textes partagés (âge) */

  function ageLine(c, style) {
    const n = c.age;
    if (style === 'souvenirs') {
      return n ? `Aujourd’hui s’ouvre le chapitre ${n}. J’ai déjà hâte de le lire avec toi.`
        : 'Aujourd’hui s’ouvre un nouveau chapitre. J’ai déjà hâte de le lire avec toi.';
    }
    if (!n) {
      if (style === 'toast') return 'Que la fête commence !';
      return '';
    }
    if (style === 'toast') return n >= 30 ? `${n} ans et pas une ride. Bon… presque.` : `${n} ans ! Le monde n’a qu’à bien se tenir.`;
    if (style === 'secret') return `${n} ans. Et ce n’est que le début.`;
    if (n === 18) return 'Dix-huit ans. La vie s’ouvre en grand devant toi, et j’ai hâte de voir tout ce que tu vas en faire.';
    if (n >= 70) return `${AGE_WORDS[n] || n} ans. Et toujours cette lumière dans les yeux, qui rend tout plus doux autour de toi.`;
    if (n >= 20 && n % 10 === 0) return `${AGE_WORDS[n] || n} ans. Chaque année t’a rendu${G(c, '', 'e')} un peu plus toi-même, et c’est un bonheur de faire partie du voyage.`;
    if (n < 13) return `${n} ans aujourd’hui ! Fais un vœu, un vrai, de ceux qu’on ne dit à personne.`;
    return `${n} ans aujourd’hui. Une année toute neuve commence, et elle a de la chance de t’avoir.`;
  }

  function sayThat(I) {
    if (I.length === 1) return `Je dirais que tu ${I[0]}.`;
    if (I.length === 2) return `Je dirais que tu ${I[0]}. Et que tu ${I[1]}.`;
    return `Je dirais que tu ${I[0]}. Que tu ${I[1]}. Et que tu ${I[2]}.`;
  }

  /* -------------------------------------------------- 1. Lettre à cœur ouvert */

  function lettre(c, v) {
    const S = [];
    const yearsIntro = c.years ? `Cela fait ${c.years} an${c.years > 1 ? 's' : ''} que tu fais partie de ma vie, et je réalise que je ne t’ai jamais écrit une vraie lettre. Celle-ci rattrape un peu le retard.` : null;
    const intros = {
      friend: [yearsIntro, 'On se dit beaucoup de choses, toi et moi. Des bêtises, des confidences, des messages vocaux beaucoup trop longs. Mais il y a des choses que je ne t’ai jamais vraiment écrites. Alors aujourd’hui, je prends le temps.',
        'J’ai commencé cette lettre plusieurs fois. Ce n’est pas simple d’écrire à quelqu’un qui compte autant. Mais certaines choses méritent d’être dites au moins une fois, noir sur blanc.'],
      best: [yearsIntro, `Le hasard a bien fait les choses le jour où il t’a mis${G(c, '', 'e')} sur ma route. Depuis, je n’imagine plus ma vie sans toi. Je ne te le dis pas assez, alors aujourd’hui, je te l’écris.`,
        'On se comprend souvent sans parler, toi et moi. Mais aujourd’hui, j’ai envie de mettre des mots sur ce qu’on ne se dit jamais.'],
      love: ['Il y a des jours où je te regarde sans rien dire, en me demandant comment j’ai eu cette chance. Aujourd’hui, je n’ai pas envie de me taire.',
        'Je pourrais t’offrir des fleurs, un dîner, un cadeau. Je le ferai sûrement. Mais avant tout ça, je voulais t’offrir ce que j’ai de plus sincère : des mots, rien que pour toi.'],
      parent: ['Tu m’as appris mes premiers mots. C’est étrange, et très doux, de les utiliser aujourd’hui pour te dire tout ce que je ne dis pas assez.',
        'On ne dit pas souvent ces choses-là à ses parents. On les pense très fort, on les garde pour plus tard. Aujourd’hui, je n’ai plus envie d’attendre.'],
      sibling: ['On a grandi ensemble, avec les mêmes souvenirs d’enfance et quelques disputes que je ne regrette même pas. Aujourd’hui, j’ai envie de te dire ce qu’on ne se dit presque jamais, nous deux.',
        'Tu me connais par cœur : mes défauts, mes manies, mes fous rires. Pourtant, il y a des choses que je ne t’ai jamais vraiment dites. Elles sont dans cette lettre.'],
      child: ['Je te regarde grandir depuis le premier jour, et chaque année tu me surprends un peu plus. Aujourd’hui, c’est mon tour de te surprendre.',
        'Un jour, tu reliras peut-être cette lettre en souriant. J’espère que tu sauras alors à quel point, aujourd’hui déjà, tu illumines ma vie.'],
      elder: ['Chez toi, le temps a toujours eu un goût différent. Plus lent, plus doux. Aujourd’hui, c’est moi qui prends le temps : celui de t’écrire.',
        'Tu as tant donné, tant raconté, tant transmis. Aujourd’hui, c’est à mon tour de te raconter quelque chose : ce que tu représentes pour moi.'],
      work: ['On se croise surtout entre deux réunions et trois cafés. Mais certaines personnes rendent les journées plus légères, et tu en fais partie. Je voulais te l’écrire, pour une fois.'],
      other: [yearsIntro, 'Il y a des personnes qu’on garde près de soi, quoi qu’il arrive. Tu en fais partie. Et aujourd’hui, j’ai envie de te le dire autrement qu’en passant.']
    };
    S.push(scene('intro', c.to + ',', choose(c, v, 'intro', intros[c.group])));

    if (c.memory) {
      const m = c.memory;
      const x = m.mode === 'np'
        ? choose(c, v, 'memory', [
          `Je repense souvent ${a(m.text)}. Je ne sais pas si tu t’en souviens aussi bien que moi, mais ce moment-là, je l’ai gardé précieusement. Certains souvenirs ne pâlissent jamais. Celui-ci en fait partie.`,
          `Il y a un souvenir qui revient toujours quand je pense à toi : ${m.text}. C’est fou comme un instant qui semblait ordinaire peut devenir, avec le temps, l’un des plus précieux.`])
        : choose(c, v, 'memory', [
          `Il y a un souvenir qui revient toujours quand je pense à toi.\n\n${m.text}\n\nJe ne sais pas si tu t’en souviens aussi bien que moi. Moi, je l’ai gardé précieusement.`,
          `Je ferme les yeux et j’y suis encore.\n\n${m.text}\n\nCertains souvenirs ne pâlissent jamais. Celui-ci en fait partie.`]);
      S.push(scene('memory', '', x, { p: memPhoto(c) }));
    }

    if (c.joke) {
      S.push(scene('joke', '', choose(c, v, 'joke', [
        `Et puis il y a « ${c.joke} ». Je n’ai pas besoin d’en dire plus : tu souris déjà, je le sais.`,
        `« ${cap(c.joke)} ». Personne d’autre ne comprendrait. Et c’est exactement pour ça que j’y tiens autant.`])));
    }

    if (c.quals.length || c.admire) {
      const A = adjs(c), I = imgs(c);
      let x = '';
      if (I.length) {
        x = choose(c, v, 'portrait', [
          `Si quelqu’un me demandait de te décrire, je ne dirais pas seulement que tu es ${join(A)}. ${sayThat(I)}`,
          `Tu es ${join(A)}. Les mots sont justes, mais ils ne suffisent pas. Alors voilà ce que je vois, moi : tu ${I.join(' ; tu ')}.`]);
        if (c.admire) x += `\n\nMais ce que j’admire le plus chez toi, c’est ${c.admire}.`;
      } else {
        x = choose(c, v, 'portrait', [
          `Ce que j’admire le plus chez toi, c’est ${c.admire}. Je ne te le dis pas souvent, mais je le remarque. À chaque fois.`,
          `Je crois que je ne te l’ai jamais dit clairement, alors voilà : ce que j’admire le plus chez toi, c’est ${c.admire}.`]);
      }
      S.push(scene('portrait', '', x));
    }

    S.push(...photoScenes(c, restFrom(c)));

    if (c.thanks) {
      S.push(scene('thanks', '', choose(c, v, 'thanks', [
        `Je ne te l’ai sans doute pas assez dit, alors je l’écris ici, noir sur blanc : merci ${c.thanks}. Ce genre de chose, on croit que ça passe inaperçu. Ça ne passe jamais inaperçu.`,
        c.group === 'parent'
          ? `Merci ${c.thanks}. Et merci pour tout ce que je ne remarque même plus, tellement tu le fais avec naturel.`
          : `Merci ${c.thanks}. Tu ne t’en rends peut-être pas compte, mais c’est exactement ce genre de geste qui aide quelqu’un à tenir debout.`])));
    }

    if (c.wish) {
      const when = c.age ? `Pour tes ${c.age} ans` : 'Pour cette nouvelle année';
      S.push(scene('wish', '', choose(c, v, 'wish', [
        `${when}, je te souhaite ${c.wish}. Et pour tout le reste, je te souhaite d’être aimé${G(c, '', 'e')} aussi fort que tu sais aimer.`,
        `${when}, je te souhaite ${c.wish}. Je te souhaite aussi des matins légers, des fous rires imprévus, et des gens qui te méritent.`])));
    }

    S.push(scene('reveal', `Joyeux anniversaire, ${c.to}.`, ageLine(c, 'lettre')));
    if (c.secret) S.push(scene('secret', 'P.-S.', c.secret));

    const closings = {
      friend: [`Merci d’être exactement qui tu es. Ne change rien, ou alors seulement pour être encore plus heureu${G(c, 'x', 'se')}.`],
      best: [`On ne choisit pas sa famille, paraît-il. Moi, je t’ai choisi${G(c, '', 'e')}. Et je te choisirais encore, à chaque fois.`],
      love: ['De toutes les années qui m’attendent, je veux qu’il y en ait le plus possible avec toi. Je t’aime.'],
      parent: [`Tout ce qu’il y a de bon en moi, je te le dois un peu. Je t’aime, ${c.to}.`],
      sibling: ['On se taquine, on se dispute, mais on ne se lâche jamais. Jamais. Je serai toujours là pour toi.'],
      child: [`Où que la vie t’emmène, tu auras toujours une maison dans mon cœur. ${F(c, 'Je suis tellement fier de toi.', 'Je suis tellement fière de toi.', 'Tu es ma plus grande fierté.')}`],
      elder: [`Merci pour les racines, ${c.to}. C’est grâce à elles que j’ose grandir.`],
      work: ['Merci de rendre le quotidien plus léger. Je te souhaite une année à ta hauteur : lumineuse, et pleine de belles surprises.'],
      other: ['Merci d’être là, simplement. C’est déjà énorme.']
    };
    S.push(scene('closing', '', choose(c, v, 'closing', closings[c.group].concat(
      'Garde cette lettre quelque part. Et les jours où tu doutes, relis-la : chaque mot est vrai.'))));
    return S;
  }

  /* ----------------------------------------------------- 2. Album de souvenirs */

  function souvenirs(c, v) {
    const S = [];
    const family = /^(parent|sibling|elder)$/.test(c.group);
    let intro;
    if (c.years) intro = `${c.years} an${c.years > 1 ? 's' : ''} de souvenirs. Je n’ai pas pu tous les garder ici, il faudrait des centaines de pages. Alors j’ai choisi ceux qui me font encore sourire.`;
    else if (c.group === 'child') intro = 'Avec toi, tout a commencé le jour de ta naissance. Depuis, je n’ai jamais arrêté de collectionner les souvenirs.';
    else if (family) intro = 'Certains souvenirs sont si anciens que je ne sais plus quand ils ont commencé. Avec toi, c’est comme ça : tu as toujours été là.';
    else intro = choose(c, v, 'intro', [
      'J’ai rassemblé ici quelques souvenirs. Pas tous, il faudrait des centaines de pages. Juste ceux qui me font encore sourire.',
      'Il y a des albums qu’on range sur une étagère. Celui-ci, je l’ai fait pour qu’il voyage jusqu’à toi.']);
    S.push(scene('intro', `L’album de ${c.to}`, intro));

    if (c.memory) {
      const m = c.memory;
      const x = m.mode === 'np'
        ? `Tu te souviens ${de(m.text)} ? Moi, comme si c’était hier. Il suffit parfois d’un rien, une odeur, une chanson, pour que j’y sois de nouveau.`
        : `${m.text}\n\nTu t’en souviens ? Moi, comme si c’était hier. Il suffit parfois d’un rien, une odeur, une chanson, pour que j’y sois de nouveau.`;
      S.push(scene('memory', 'Tu te souviens ?', x, { p: memPhoto(c) }));
    }

    S.push(...photoScenes(c, restFrom(c)));

    if (c.joke) S.push(scene('joke', 'Rien qu’à nous', `« ${cap(c.joke)} »\n\nPersonne d’autre ne comprendra jamais. C’est exactement pour ça que j’y tiens autant.`));

    if (c.quals.length || c.admire) {
      const I = imgs(c);
      let x;
      if (I.length) {
        x = 'Sur les photos, on voit ton sourire. Ce qu’elles ne montrent pas, c’est que tu ' +
          (I.length === 1 ? I[0] : I.length === 2 ? `${I[0]}, et que tu ${I[1]}` : `${I[0]}, que tu ${I[1]}, et que tu ${I[2]}`) + '.';
        if (c.admire) x += `\n\nElles ne montrent pas non plus ce que j’admire le plus chez toi. C’est ${c.admire}.`;
      } else {
        x = `Sur les photos, on voit ton sourire. Ce qu’elles ne montrent pas, c’est ce que j’admire le plus chez toi. C’est ${c.admire}.`;
      }
      S.push(scene('portrait', 'Ce que les photos ne montrent pas', x));
    }

    if (c.thanks) S.push(scene('thanks', 'Merci', `Si je devais légender cette page, j’écrirais simplement : merci ${c.thanks}.`));
    if (c.wish) S.push(scene('wish', 'La page blanche', `Il reste tant de pages blanches dans cet album. Pour celles de cette année, je te souhaite ${c.wish}.`));

    S.push(scene('reveal', `Joyeux anniversaire, ${c.to}`, ageLine(c, 'souvenirs')));
    if (c.secret) S.push(scene('secret', 'Une dernière photo', c.secret));

    const closings = {
      love: 'Merci pour tous ces souvenirs. Les plus belles pages, j’en ai la certitude, restent à écrire. Ensemble.',
      parent: 'Merci pour tous ces souvenirs, et pour ceux dont je ne me souviens même pas, mais que tu gardes pour nous deux.',
      child: 'Merci pour tous ces souvenirs. Tu ne le sais pas encore, mais tu es le plus beau chapitre de ma vie.',
      elder: 'Merci pour tous ces souvenirs. Ils font partie de moi, pour toujours.'
    };
    S.push(scene('closing', '', closings[c.group] || 'Merci pour tous ces souvenirs. J’ai hâte de remplir les prochaines pages avec toi.'));
    return S;
  }

  /* ------------------------------------------------------- 3. Le grand secret */

  function secret(c, v) {
    const S = [];
    S.push(scene('intro', 'Avant de commencer', choose(c, v, 'intro', [
      `Trouve un endroit calme, ${c.to}. Ce qui suit a été préparé rien que pour toi, et personne d’autre n’est censé le lire.`,
      'Ce message va s’autodétruire dans… non, je plaisante. Mais lis-le quand même comme un secret. Parce que c’en est un.'])));

    const facts = [];
    if (c.memory) {
      facts.push({
        x: c.memory.mode === 'np'
          ? `Je repense encore ${a(c.memory.text)}. Bien plus souvent que tu ne l’imagines.`
          : `${c.memory.text} J’y repense encore. Bien plus souvent que tu ne l’imagines.`,
        p: memPhoto(c)
      });
    }
    if (c.quals.length) {
      const k = c.quals[0];
      let x = `Quand on me demande de te décrire, le premier mot qui me vient, c’est « ${QUALITIES[k][c.g === 'f' ? 1 : 0]} ». Parce que tu ${QUALITIES[k][2]}.`;
      if (c.admire) x += `\n\nEt ce que j’admire le plus chez toi, c’est ${c.admire}. Je ne te l’avais jamais dit comme ça.`;
      facts.push({ x });
    } else if (c.admire) facts.push({ x: `Ce que j’admire le plus chez toi, c’est ${c.admire}. Je ne te l’avais jamais dit comme ça.` });
    if (c.joke) facts.push({ x: `Il m’arrive encore d’éclater de rire en repensant à « ${c.joke} ». Même dans les pires moments.` });
    if (c.thanks) facts.push({ x: `Je ne t’ai jamais assez remercié${G(c, '', 'e')} ${c.thanks}. Alors voilà, c’est fait : merci. Du fond du cœur.` });
    const list = facts.slice(0, 4);
    if (list.length) {
      const n = list.length;
      S.push(scene('teaser', '', n === 1 ? 'Il y a une chose que tu ne sais peut-être pas.' : `Voici ${COUNT_WORDS[n].toLowerCase()} choses que tu ne sais peut-être pas.`));
      list.forEach((f, i) => S.push(scene('fact', COUNT_WORDS[i + 1] === 'Une' ? 'Un' : COUNT_WORDS[i + 1], f.x, { p: f.p == null ? -1 : f.p })));
    }

    S.push(scene('countdown', '', 'Maintenant, ferme les yeux. Compte jusqu’à trois…'));
    S.push(scene('reveal', `Joyeux anniversaire, ${c.to}`, ageLine(c, 'secret')));
    S.push(...photoScenes(c, restFrom(c)));
    if (c.wish) S.push(scene('wish', 'Mon vœu pour toi', `Le vœu, c’est toi qui le fais. Mais si j’avais droit au mien, je te souhaiterais ${c.wish}.`));
    if (c.secret) S.push(scene('secret', 'Ce n’est pas tout…', c.secret));

    const closings = {
      parent: `Voilà, maintenant tu sais. Et si tu ne devais retenir qu’une chose : je t’aime, ${c.to}.`,
      child: 'Voilà mon secret : tu es la plus belle chose qui me soit arrivée.',
      elder: 'Voilà mon secret : tu es mon modèle, depuis toujours.',
      love: 'Voilà mon secret. Enfin, ce n’en est plus vraiment un : je t’aime.'
    };
    S.push(scene('closing', '', closings[c.group] || 'Voilà. Maintenant, tu sais tout. Enfin… presque tout. Le reste, je te le dirai en vrai.'));
    return S;
  }

  /* --------------------------------------------------------------- 4. Le toast */

  function toast(c, v) {
    const S = [];
    S.push(scene('intro', '*tink tink tink*', choose(c, v, 'intro', [
      `Un peu de silence, s’il vous plaît. Merci. Aujourd’hui, nous sommes réunis pour célébrer une personne absolument remarquable : ${c.to}.`,
      `Mesdames, messieurs, et toi surtout, ${c.to} : je vais faire un discours. Ne t’inquiète pas, j’ai promis de ne pas pleurer. Enfin… j’ai promis d’essayer.`])));

    if (c.joke) S.push(scene('joke', 'Un peu de contexte', `Pour celles et ceux qui ne suivent pas, un seul mot : « ${c.joke} ». Voilà. Ceux qui savent, savent.`));

    if (c.memory) {
      const m = c.memory;
      S.push(scene('memory', 'L’histoire', m.mode === 'np'
        ? `Et puis il y a cette histoire que je raconte à chaque occasion, tant pis si tu la connais par cœur : ${m.text}. Je ne m’en lasserai jamais.`
        : `Et puis il y a cette histoire que je raconte à chaque occasion, tant pis si tu la connais par cœur.\n\n${m.text}\n\nJe ne m’en lasserai jamais.`, { p: memPhoto(c) }));
    }

    if (c.quals.length || c.admire) {
      const I = imgs(c);
      let x = '';
      if (I.length) {
        x = 'Derrière les fous rires, il y a quelqu’un de rare. Alors je lève mon verre à toi, qui ' + I[0] + '.';
        if (I[1]) x += ` À toi, qui ${I[1]}.`;
        if (I[2]) x += ` Et à toi, qui ${I[2]}.`;
        if (c.admire) x += `\n\nCe que j’admire le plus chez toi ? C’est ${c.admire}.`;
      } else {
        x = `Derrière les fous rires, il y a quelqu’un de rare. Ce que j’admire le plus chez toi ? C’est ${c.admire}. Je lève mon verre à ça.`;
      }
      S.push(scene('portrait', 'Plus sérieusement', x));
    }

    S.push(...photoScenes(c, restFrom(c)));

    if (c.thanks) S.push(scene('thanks', 'Un merci', `Et puisqu’on est entre nous : merci ${c.thanks}. Sincèrement. (Oui, ça m’arrive aussi d’être sérieux. Profites-en.)`.replace('sérieux', F(c, 'sérieux', 'sérieuse', 'sincère'))));

    S.push(scene('reveal', `Joyeux anniversaire, ${c.to} !`, ageLine(c, 'toast')));
    if (c.wish) S.push(scene('wish', 'Mon vœu', `Pour cette nouvelle année, je te souhaite ${c.wish}. Et du gâteau. Beaucoup de gâteau.`));
    if (c.secret) S.push(scene('secret', 'Une dernière chose…', c.secret));

    const closings = {
      love: 'À toi, mon amour. À nous. Et à tout ce qui nous attend.',
      parent: `À toi, ${c.to}. Merci d’avoir supporté mes bêtises depuis le premier jour. Je t’aime.`,
      child: `À toi, ${c.to}. Que ta vie soit aussi belle que tes éclats de rire.`,
      elder: `À toi, ${c.to}. À ta santé, à ta sagesse, et à tous ces moments en famille qu’on aime tant.`,
      work: `À toi, ${c.to}. À cette nouvelle année, et à tous les cafés qu’il nous reste à partager.`
    };
    S.push(scene('closing', '', closings[c.group] || `À toi, ${c.to}. À nous. Et à toutes les bêtises qu’il nous reste à faire ensemble.`));
    return S;
  }

  /* ------------------------------------------------------------- signature */

  function signature(c, style) {
    const toastStyle = style === 'toast';
    let lead;
    switch (c.group) {
      case 'parent': lead = toastStyle ? F(c, 'Ton fils préféré (évidemment),', 'Ta fille préférée (évidemment),', 'Ton enfant préféré (évidemment),') : F(c, 'Ton fils qui t’aime,', 'Ta fille qui t’aime,', 'Avec tout mon amour,'); break;
      case 'sibling': lead = toastStyle ? F(c, 'Ton frère préféré,', 'Ta sœur préférée,', 'Avec tout mon cœur,') : F(c, 'Ton frère,', 'Ta sœur,', 'Avec tout mon amour,'); break;
      case 'elder': lead = F(c, 'Ton petit-fils qui t’aime,', 'Ta petite-fille qui t’aime,', 'Avec toute ma tendresse,'); break;
      case 'child': lead = 'Avec tout mon amour,'; break;
      case 'love': lead = toastStyle ? F(c, 'Ton plus grand fan,', 'Ta plus grande fan,', 'Pour toujours,') : 'À toi, pour toujours,'; break;
      case 'best': lead = F(c, 'Ton complice de toujours,', 'Ta complice de toujours,', 'Pour toujours,'); break;
      case 'work': lead = toastStyle ? F(c, 'Ton collègue préféré,', 'Ta collègue préférée,', 'Bien amicalement,') : 'Bien amicalement,'; break;
      case 'friend': lead = toastStyle ? F(c, 'Ton plus grand fan,', 'Ta plus grande fan,', 'Avec toute mon amitié,') : 'Avec toute mon affection,'; break;
      default: lead = 'Avec affection,';
    }
    return { lead, name: c.from };
  }

  /* ------------------------------------------------------------------- API */

  const BUILDERS = { lettre, souvenirs, secret, toast };

  function build(answers, style, variants) {
    const c = context(answers);
    const st = BUILDERS[style] ? style : 'lettre';
    const scenes = BUILDERS[st](c, variants || {}).filter(s => s && (s.x || s.title || s.t === 'photo' || s.t === 'reveal'));
    return { style: st, scenes, sign: signature(c, st), ctx: c };
  }

  function excerpt(answers, style, max) {
    const { scenes } = build(answers, style);
    const text = scenes.filter(s => s.x && s.t !== 'photo').slice(0, 2).map(s => s.x.replace(/\n+/g, ' ')).join(' ');
    const lim = max || 210;
    return text.length > lim ? text.slice(0, text.lastIndexOf(' ', lim)).replace(/[\s,;: ]+$/, '') + '…' : text;
  }

  function depth(ans) {
    const A = ans || {};
    const has = k => (k === 'qualities' ? (A.qualities || []).length > 0 : clean(A[k]).length > 2);
    const order = ['memory', 'joke', 'admire', 'thanks', 'wish', 'qualities', 'secret'];
    let score = 0;
    order.forEach(k => { if (has(k)) score += k === 'memory' ? 2 : 1; });
    const level = score >= 6 ? 'Inoubliable' : score >= 4 ? 'Très personnelle' : score >= 2 ? 'Jolie lettre' : 'Esquisse';
    return { score, max: 8, level, next: order.find(k => !has(k)) || null };
  }

  const api = { RELATIONS, QUALITIES, STYLES, LABELS, build, excerpt, depth, context, typo, _norm: { normMemory, normAdmire, normThanks, normWish, a, de } };
  root.EclatStory = api;
})(typeof window !== 'undefined' ? window : globalThis);
