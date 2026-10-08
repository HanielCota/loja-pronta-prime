# Lupita — artes da plataforma

Lupita é o mascote compartilhado da Loja Pronta e do SLL. A referência fornecida pelo dono tem
corpo laranja, pontas roxas, cílios, barriga clara, etiqueta com estrela e duas estrelas ao lado.
A interface mantém as cores dos tokens; as cores da Lupita pertencem à ilustração.

As artes foram preparadas com a ferramenta integrada de imagem do Codex, em 7 de outubro de
2026, a partir da referência. São PNGs de 1254 × 1254 com transparência, importados de
`src/components/brand/mascot/assets/` para que os endereços mudem junto com o conteúdo:

- `mascote-rosto.png`: desenho completo, para a barra do topo e usos pequenos.
- `mascote-base.png`: olhos brancos e cílios, sem pupilas, sobrancelhas ou boca.
- `mascote-corpo.png`: mesma base sem os braços, para receber as articulações por cima.
- `mascote-bracos.png`: braços isolados da pose original; referência para preparar a pose relaxada.
- `mascote-bracos-relaxados.png`: dois braços curtos já apontando para baixo, com mãos roxas
  arredondadas, polegar discreto e pontas suaves. Cada lado tem sua própria forma e iluminação.
  Em `art.ts`, o tamanho e a posição alinham os ombros com o corpo; o braço esquerdo fica sobre ele.
- `mascote-olhos-fechados.png`: pele nas regiões dos olhos, para cobrir olhos e cílios.
- `mascote-favicon.png`: arte original só do rosto e das orelhas, enquadrada para a aba do navegador.

O rosto animado usa as medidas de `art.ts`, com pupilas, brilhos, boca e sobrancelhas por cima
do corpo. As reações existentes continuam: olhar, senha, erro, sucesso, toque e cochilo. As mãos
ficam baixas, com balanço independente e um movimento pequeno do corpo durante gestos de 4,4s
ao chegar e interagir. Os gestos param fora da tela, com a aba escondida ou movimento reduzido.
Se uma arte mudar de composição, as medidas precisam ser conferidas junto no navegador.

## Ícones do navegador

O favicon usa a cabeça da Lupita, com olhos e sorriso grandes para leitura em tamanhos pequenos.
A arte foi criada com a ferramenta integrada de imagem, e os arquivos finais foram exportados
com Sharp apenas para ajustar tamanho e formato:

- `src/app/favicon.ico`: imagens PNG de 16, 32 e 48px, com transparência, dentro do arquivo ICO.
- `src/app/icon.png`: PNG transparente de 512px.
- `src/app/apple-icon.png`: PNG opaco de 180px, com o fundo claro obtido do token `--background`
  de `globals.css`, para o atalho do iPhone.

O Next publica esses arquivos e inclui os links no cabeçalho pela convenção de nomes. A arte
completa do rosto fica guardada em `mascote-favicon.png` para novas exportações.

## Prompts usados

### Desenho completo

> Use case: background-extraction. Asset type: Lupita mascot cutout for a web app. Input image
> 1 is the edit target. Remove only the white background and floor shadow, producing real
> transparent alpha. Keep exactly the same orange and purple character, face, eyes, eyelashes,
> eyebrows, smiling mouth, blush, ears, arms, feet, belly, purple strap and star tag, and both
> floating stars. Preserve pose, proportions, rendering, colors, lighting and placement. Use a
> square canvas, centered with all elements fully visible and a small transparent margin. No
> added details, no text, no recoloring, no new background, no cast floor shadow.

### Base do rosto

> Use case: precise-object-edit. Asset type: exact registered animation base for the Lupita
> mascot. Edit the attached transparent cutout. Change ONLY three facial feature details: (1)
> remove both dark pupils including their highlights, leaving each existing white eyeball
> uniformly white with the original eyeball silhouette, dark outer outlines and upper eyelashes
> unchanged; (2) erase both eyebrows and smoothly fill their areas with matching orange skin;
> (3) erase the smiling mouth and tongue, smoothly fill that small area with matching orange
> skin. Keep rosy cheeks. Keep absolutely every other pixel and shape: same exact square canvas
> and character position, eye white locations, eye outlines and eyelashes, same ears,
> orange/purple body, hands, feet, belly, purple strap and star tag, floating stars, lighting,
> material, proportions and pose. True transparent alpha background. No new outlines, eyes,
> mouth or eyebrows; this will have those features animated on top by code. Do not shift, zoom,
> rotate, crop, redraw or reframe the character.

### Pele dos olhos

> Use case: precise-object-edit. Asset type: registered eyelid skin layer for web animation.
> Input is the exact edit target. Erase ONLY both entire white eyeballs, their dark outlines and
> eyelashes, filling those eye areas smoothly with the surrounding orange skin and the same
> lighting. The eyebrows and mouth are already erased and must stay erased. Keep rosy cheeks.
> Everything outside the immediate two eye regions must remain in precisely the same position,
> dimensions, colors and rendering. Preserve identical square canvas and pose, transparent
> alpha, ears, hands, belly, purple strap and star tag, feet, both floating stars. Do NOT draw
> closed-eye lines or any other face details. Do NOT move, reframe, zoom, rotate, crop or redesign
> anything.

### Corpo sem braços

> Use case: precise-object-edit. Asset type: Lupita body layer for a web animation rig. Input is
> the exact edit target, a square transparent mascot with blank white eyes and no eyebrows or
> mouth. Remove ONLY the two arms/hands: the round orange-purple arm/hand in the lower LEFT
> foreground (the rounded oval in front of her side) and the orange-purple waving arm protruding
> to the RIGHT. Reconstruct her smooth orange side and torso behind those two removed arms with
> matching skin, lighting and volume. No replacement arms. Keep the original eye whites and
> eyelashes exactly where they are; keep the face blank without pupils, mouth or eyebrows. Keep
> cheeks, ears, feet, peach belly, purple diagonal strap, star tag and both floating stars.
> CRITICAL: preserve the exact input square canvas, character size, position, body proportions
> and all other original pixels/geometry. No shift, zoom, crop, rotation or redesign. Genuine
> transparent alpha outside the body; no floor shadow. This layer will be overlaid with the
> original arms rotated downward by code.

### Braços separados

> Use case: precise-object-edit. Asset type: two isolated Lupita arm layers for a web animation
> rig. This transparent square image is the exact edit target. Keep ONLY the TWO orange-purple
> arms/hands in their exact existing locations and orientations: (1) the round oval foreground
> arm/hand at lower LEFT around x 19-36%, y 57-75%, and (2) the longer raised arm/hand at RIGHT
> around x 70-86%, y 43-63%. Remove EVERYTHING else to genuine transparent alpha: the head,
> ears, eye whites, eyelashes, cheeks, torso, belly, strap, tag, legs, feet and floating stars.
> Carefully separate the arms from the body: no stray pieces of orange torso, face, cheek,
> strap or tag. Reconstruct just the small shoulder end of each arm into a smooth rounded
> orange cap, so each isolated arm is one soft rounded shape with no pointed corners or angular
> wedges. Preserve the original orange-to-purple gradients, material, volume, lighting and hand
> shapes. CRITICAL: preserve exact input square canvas and register each arm to its exact
> original pixel location and scale; no shift, zoom, crop, repositioning, change in orientation
> or redesign. Exactly two disconnected rounded arms on a transparent square canvas, no other
> objects, no shadow, no text.

### Braços e mãos em repouso

> Use case: precise-object-edit. Asset type: registered transparent relaxed-arm layer for the
> Lupita web mascot. Image 1 is the exact square placement guide (the existing body without
> arms). Image 2 is a style and identity reference (the complete original Lupita). Create ONLY
> two new compact arms and soft rounded hands already hanging naturally downward at her sides.
> Output only the arms on genuine transparent alpha; do not include any part of the head, eyes,
> torso, belly, strap, tag, legs, feet or stars. Preserve the exact square canvas, scale, 3D toy
> material, orange-to-purple colors and soft lighting from the references. Place the LEFT orange
> shoulder at x 30%, y 64%, with its purple rounded hand centered at x 26%, y 74%; this arm
> occupies roughly x 21-33%, y 61-80%. Place the RIGHT orange shoulder at x 70%, y 61%, with its
> purple rounded hand centered at x 75%, y 72%; this arm occupies roughly x 67-80%, y 58-78%.
> Both shoulders must overlap the body silhouette at those attachment points when composited.
> The arms should be short, comfortably thick, gently tapered and almost vertical with a very
> small outward angle. The hand is a plump mitten-like mascot paw, with one subtle rounded thumb
> and just two shallow soft fingertip scallops, readable at small size. Maintain continuous
> smooth volume from shoulder through wrist to hand: no sharp elbow kink, bent-back wrist, thin
> neck, pinched joints or long drooping forearm. Left and right have matching proportions but
> naturally different light and perspective. Match the original character's simplicity; no
> realistic human anatomy, fingernails, glove seams, outlines, accessories or extra limbs.
> Orange upper arms blend smoothly to purple hands. Exactly two separated arms/hands in their
> registered resting positions, no background, no shadow outside the arms, no text.

### Rosto para favicon

> Use case: precise-object-edit. Asset type: Lupita favicon master for a membership website. The
> attached complete Lupita is the exact identity reference. Create a square, tightly framed
> HEAD-ONLY icon of this same orange mascot: keep her distinctive floppy upper ear with purple
> tip, small rounded ear, dark oval eyes with clean white highlights and eyelashes, rosy cheeks,
> small joyful open smile and tongue. Preserve the original orange/purple palette, soft 3D toy
> material, lighting and cute identity. Arrange the head and ears upright and centered, filling
> about 90% of the square while keeping the whole silhouette visible with a small even
> transparent margin. Remove the body, arms, hands, feet, belly, strap, tag and floating stars
> entirely. The bottom is a continuous rounded chin, with no neck or cut-off torso. Simplify
> tiny details only enough for clear recognition at 16 and 32 pixels; eyes and smile should have
> strong clear silhouettes. Genuine transparent alpha background. No frame, colored tile, text,
> letters, watermark, additional objects or floor shadow. One friendly Lupita head, consistent
> with the reference, optimized for a browser tab icon.
