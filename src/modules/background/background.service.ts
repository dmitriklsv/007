import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

/* eslint-disable */
const COLLECTIONS = [
  "sei1hvfnkmf8vy7awjf60h6eeaywpq378329x8z4k9ctkf3lpl0x536qp4lrhu",
  "sei1l8tjmjagrrjtrzncewtvscs39dezdcg2cuvemen3wgunlfpr45qqpaawl9"
];
/* eslint-enable */

@Injectable()
export class BackgroundService {
  constructor() {}

  @Cron(CronExpression.EVERY_SECOND)
  async createCollections() {}

  private async createNftOnEachCollection() {}
}
