/* Editorial collections are independently curated for each edition.
   Edit the names, descriptions and visual themes here at any time.
   Counts come from published articles, never from the example counts shown on other platforms. */
window.TRN = Object.freeze({
  penName: 'Tomato Ricenoodles',
  penNameZh: '番茄米线',
  links: {
    en: { medium: '', matters: '' },
    zh: { medium: '', matters: '' }
  },
  collections: {
    en: [
      {slug:'organziology', art:'/assets/graphics/en-organziology.svg', title:'Organziology', description:'An ongoing inquiry into organizations and the ways we live together.', theme:'copper', category:'essay'},
      {slug:'basic-human-science', art:'/assets/graphics/en-basic-human-science.svg', title:'Basic Human Science', description:'A closer look at the human world and the ideas that explain it.', theme:'sage', category:'essay'},
      {slug:'on-ethics', art:'/assets/graphics/en-on-ethics.svg', title:'On Ethics', description:'Questions of morality, principles, and their place in daily life.', theme:'ink', category:'essay'}
    ],
    zh: [
      {slug:'basic-humanities', art:'/assets/graphics/zh-basic-humanities.svg', title:'基础人文科学', description:'基础经济学、哲学、政治与社会科学', theme:'stone', category:'essay'},
      {slug:'mission-of-capitalism', art:'/assets/graphics/zh-mission-of-capitalism.svg', title:'资本主义的历史使命', description:'如果利润足够可观，资本家甚至愿意出卖吊死自己的绳子。', theme:'copper', category:'essay'},
      {slug:'on-morality', art:'/assets/graphics/zh-on-morality.svg', title:'论道德', description:'圣人不死，大盗不止。', theme:'ink', category:'essay'},
      {slug:'short-fiction', art:'/assets/graphics/zh-short-fiction.svg', title:'短篇 | 小雪堆', description:'短篇小说与中篇故事', theme:'blue', category:'fiction'},
      {slug:'poems', art:'/assets/graphics/zh-poems.svg', title:'诗笺', description:'古体诗与现代诗', theme:'sage', category:'poetry'}
    ]
  }
});
