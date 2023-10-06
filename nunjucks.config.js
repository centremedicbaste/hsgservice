
const nunjucks = require('nunjucks');
const marked = require('marked');
const data = require('./data/data.json');
const env = new nunjucks.Environment();

// Convierte el contenido Markdown en HTML y lo agrega al objeto `data`
Object.keys(data).forEach((key) => {
  if (key.endsWith('_markdown')) {
    const htmlKey = key.replace('_markdown', '_html');
    const markdownContent = data[key];
    const htmlContent = marked(markdownContent);
    data[htmlKey] = htmlContent;
  }
});


module.exports = {
  root: './src',
  data: {
    ...data,
  },
  nunjucksEnv: env,
};



env.addFilter('empty', function (input) {
  return !input || input.length === 0;
});