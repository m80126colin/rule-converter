import * as _ from 'lodash';

type PortableRule  = [string, string, string[]]

class Rule {
  origin  : string;
  derived : string;
  dont    : string[];
  constructor(origin : string, derived : string, dont : string[] = []) {
    this.origin  = origin
    this.derived = derived
    this.dont    = dont
  }
  export() : PortableRule {
    const rule = this
    return [rule.origin, rule.derived, rule.dont]
  }
}

const rulekey = r => `${r[0]}-${r[1]}`
const punctuation = '。？！，、；：「」『』（）［］〔〕【】—…'

interface ConvertUnit {
  state   : string,
  content : string,
  result  : string
}

export class RuleConverter {
  rules : Rule[];
  table : _.Dictionary<Rule[]>;
  //
  private table_maker() {
    const converter = this
    converter.table = _.groupBy(converter.rules, 'origin')
  }
  // constructor
  constructor(str : string = '[]') {
    const converter = this
    const rules : PortableRule[] = JSON.parse(str)
    converter.rules = _.chain(rules)
      .sortBy(rulekey)
      .map(r => new Rule(r[0], r[1], r[2]))
      .value()
    converter.table_maker()
  }
  // import & export
  static import(str : string) {
    return new RuleConverter(str)
  }
  export() {
    const converter = this
    const rules = _.chain(converter.rules)
      .map(r => r.export())
      .sortBy(rulekey)
      .value()
    return JSON.stringify(rules)
  }
  //
  add(origin : string, derived : string, dont : string[] = []) {
    const converter = this
    converter.rules = _.concat(converter.rules, new Rule(origin, derived, dont))
    converter.table_maker()
  }
  update(index : number, rule : Rule) {
    const converter = this
    _.assign(converter.rules[index], rule)
    converter.table_maker()
  }
  delete(index : number) {
    const converter = this
    _.remove(converter.rules, (x, idx) => idx === index)
    converter.table_maker()
  }
  // convert
  convert(text : string) : ConvertUnit[][] {
    const converter = this
    const rules = converter.rules
    const table = converter.table
    const donts = _.chain(rules)
      .flatMap(r => r.dont)
      .sortBy(x => -x.length)
      .value()
    const keys = _.chain(rules)
      .map(r => r.origin)
      .sortBy(x => -x.length)
      .value()
    const pats = _.concat([], donts, _.split(punctuation, ''), keys)
    const pattern = new RegExp(`(${_.join(pats, '|')})`, 'ug')
    return _.chain(text)
      .split(/\r?\n/ug)
      .map(_.trim)
      .compact()
      .map(row => _.chain(row)
        .split(pattern)
        .compact()
        .map(str => {
          if ((table[str] || '').length !== 1) {
            return {
              state: (table[str]) ? 'ambiguous' : 'plain',
              content: str,
              result: str
            }
          }
          return {
            state: 'auto',
            content: str,
            result: table[str][0].derived
          }
        })
        .value())
      .value()
  }
}