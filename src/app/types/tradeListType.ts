import {Enum, EnumType, IStaticEnum} from "../platform/enum";

@Enum("description")
export class TradeListType extends (EnumType as IStaticEnum<TradeListType>) {
    static readonly FULL = new TradeListType("Полный");
    static readonly STOCK = new TradeListType("Акции");
    static readonly BOND = new TradeListType("Облигации");
    static readonly MONEY = new TradeListType("Доходы и Расходы");

    private constructor(public description: string) {
        super();
    }
}