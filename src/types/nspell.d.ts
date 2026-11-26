declare module 'nspell' {
  type Dictionary = {
    aff: string;
    dic: string;
  };

  type SpellChecker = {
    correct: (word: string) => boolean;
  };

  function nspell(dictionary: Dictionary): SpellChecker;

  export default nspell;
}
