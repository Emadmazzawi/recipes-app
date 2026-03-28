const regex = /\{.*\}/s;
const str = "```json\n{\n  \"title\": \"foo\"\n}\n```";
console.log(str.match(regex)[0]);
