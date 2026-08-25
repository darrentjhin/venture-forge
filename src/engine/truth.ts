import { CHANNELS } from "../data/channels";
import { CHURN_DRIVERS } from "../data/churnDrivers";
import { FEATURES } from "../data/features";
import { SEGMENTS } from "../data/segments";
import { choose, randomInt } from "./rng";
import type { MarketTruth } from "./types";

export function generateMarketTruth(initialState: number): { truth: MarketTruth; rngState: number } {
  let state = initialState;
  const buyer = choose(state, SEGMENTS); state = buyer.state;
  const secondaryOptions = SEGMENTS.filter((item) => item !== buyer.value);
  const secondary = choose(state, secondaryOptions); state = secondary.state;
  const price = randomInt(state, 25, 1800); state = price.state;
  const wedge = choose(state, FEATURES); state = wedge.state;
  const support = choose(state, FEATURES.filter((item) => item !== wedge.value)); state = support.state;
  const decoys = FEATURES.filter((item) => item !== wedge.value && item !== support.value).slice(0, 2);
  const churn = choose(state, CHURN_DRIVERS); state = churn.state;
  const channel = choose(state, CHANNELS); state = channel.state;
  const inflection = randomInt(state, 8, 70); state = inflection.state;
  const aggression = randomInt(state, 20, 100); state = aggression.state;
  return { truth: { buyer: buyer.value, secondaryBuyer: secondary.value, willingnessToPay: price.value, wedgeFeature: wedge.value, supportFeature: support.value, decoyFeatures: decoys, churnDriver: churn.value, channel: channel.value, demandInflectionWeek: inflection.value, competitorAggression: aggression.value / 100 }, rngState: state };
}
