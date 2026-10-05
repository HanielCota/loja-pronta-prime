// Imagens e fontes importadas viram o endereço do arquivo no pacote do vídeo.
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.woff' {
  const src: string;
  export default src;
}
declare module '*.css';
