# Profilo GitHub: scheda con il corpo del giorno

## Intento
La pagina di oggi non piace: occupa troppo, ripete le stesse cose e usa stili slegati. Chi la apre deve pensare "che figo".

## Obiettivi
- Un blocco unico: corpo celeste del giorno a sinistra, chi sei a destra.
- Pulizia: meno elementi e meno ripetizioni.
- Una nuova immagine del profilo coerente con il resto.

## Non obiettivi e anti-obiettivi
- Non cambiano il portfolio, la bio GitHub e i repo in evidenza.
- L'immagine del profilo non si aggiorna in automatico.
- Fallimento: una pagina di nuovo affollata, o un pianeta tagliato dalla scheda.

## Vincoli
- Il README di GitHub mostra gli SVG come immagini: niente script, font web o risorse esterne; animazione solo CSS, ferma con `prefers-reduced-motion`.
- Il disegno continua a venire dal codice di `1brecane/portfolio`.
- La pubblicazione sul branch `output` non deve avvenire senza `hero.svg`.

## Approcci
- **A, solo il pianeta:** il più pulito, ma cambia poco.
- **B, scheda terminale (scelto):** il maggiore impatto e si capisce subito chi sei; il testo è piccolo su telefono.
- **C, pianeta e progetti:** mostra il lavoro, ma ripete i repo in evidenza.

## Deciso insieme
- Scheda B. Titolo "Samuele Ruaro", senza chiocciola.
- Righe: `role` fullstack, backend at heart; `from` Verona, Italy; `today` nome del corpo.
- Niente righe `code`, `building` e `infra`.
- Via snake, footer `rm -rf ~` e doppioni.
- Avatar: Marte a pixel (scelto dopo aver visto Plutone accanto alla scheda).

## Scelte mie (da controllare)
- Scheda 880 x 398, fondo scuro anche in tema chiaro. Corpo intero e centrato nella metà sinistra (griglia 56 x 26, senza l'inquadratura `place` del portfolio), lune comprese; 14 fotogrammi avanti e indietro, 450 ms.
- Titolo ed etichette nel colore `palette[3]` del corpo.
- README: la scheda (cliccabile, porta al sito) e sotto una riga di link: samueleruaro.com, linkedin, email. Spariscono i due paragrafi di testo e la riga con la località.
- La rotazione resta di sette giorni; l'avatar è un'immagine fissa di Marte.
- Workflow: si toglie il passo dello snake (`PAT_TOKEN` non serve più al workflow); orari invariati. Si eliminano `assets/footer-*.svg`.
- Avatar esportato come `assets/avatar.png`, 800 x 800, senza griglia visibile tra i pixel; lo carichi tu nelle impostazioni di GitHub.

## Verifica
- Test del generatore aggiornati al nuovo layout, per tutti e sette i corpi.
- Controllo visivo dei sette SVG (nulla esce dalla scheda) e dell'avatar anche a 32 px.

## Lasciato a chi implementa
Struttura del codice in `scripts/` e posizioni esatte del testo, sulla base della bozza approvata.
