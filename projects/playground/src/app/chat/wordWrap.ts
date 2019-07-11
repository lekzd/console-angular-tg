function wordWrap(str, width, delimiter) {
  // use this on single lines of text only

  if (str.length>width) {
    var p=width
    for (; p > 0 && str[p] != ' '; p--) {}
    if (p > 0) {
      var left = str.substring(0, p);
      var right = str.substring(p + 1);

      return left + delimiter + wordWrap(right, width, delimiter);
    }
  }
  return str;
}

export function multiParagraphWordWrap(str, width, delimiter) {
  var arr = str.split(delimiter);

  for (var i = 0; i < arr.length; i++) {
    if (arr[i].length > width)
      arr[i] = wordWrap(arr[i], width, delimiter).split(delimiter);
  }

  return arr.reduce((acc, val) => acc.concat(val), []);
}