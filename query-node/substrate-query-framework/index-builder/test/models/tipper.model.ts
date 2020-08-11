import { BaseModel, NumericField, BytesField, Model, ManyToOne, StringField } from 'warthog';

import * as BN from 'bn.js';

import { Tip } from './tip.model';

@Model({ api: { description: `The members who have voted for the tip.` } })
export class Tipper extends BaseModel {
  @ManyToOne(() => Tip, (param: Tip) => param.tippers, {
    skipGraphQLField: true,
  })
  tip!: Tip;

  @BytesField({})
  tipper!: Buffer;

  @NumericField({
    transformer: {
      to: (entityValue: BN) => (entityValue) ? entityValue.toString(10) : null,
      from: (dbValue: string) => dbValue && dbValue.length > 0 ? new BN(dbValue, 10): undefined,
    },
  })
  tipValue!: BN;
}