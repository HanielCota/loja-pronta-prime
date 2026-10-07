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
- `mascote-bracos.png`: só os dois braços, com a ligação do ombro arredondada e transparente
  ao redor. A pose relaxada usa a metade direita (braço comprido) nos dois lados, espelhada para
  o esquerdo. A ponta roxa fica abaixo do ombro, junto à lateral; o braço esquerdo fica sobre o corpo.
- `mascote-olhos-fechados.png`: pele nas regiões dos olhos, para cobrir olhos e cílios.

O rosto animado usa as medidas de `art.ts`, com pupilas, brilhos, boca e sobrancelhas por cima
do corpo. As reações existentes continuam: olhar, senha, erro, sucesso, toque e cochilo. As mãos
ficam baixas, com balanço independente e um movimento pequeno do corpo durante gestos de 4,4s
ao chegar e interagir. Os gestos param fora da tela, com a aba escondida ou movimento reduzido.
Se uma arte mudar de composição, as medidas precisam ser conferidas junto no navegador.

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
