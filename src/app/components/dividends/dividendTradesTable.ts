/*
 * STRICTLY CONFIDENTIAL
 * TRADE SECRET
 * PROPRIETARY:
 *       "Intelinvest" Ltd, TIN 1655386205
 *       420107, REPUBLIC OF TATARSTAN, KAZAN CITY, SPARTAKOVSKAYA STREET, HOUSE 2, ROOM 119
 * (c) "Intelinvest" Ltd, 2019
 *
 * СТРОГО КОНФИДЕНЦИАЛЬНО
 * КОММЕРЧЕСКАЯ ТАЙНА
 * СОБСТВЕННИК:
 *       ООО "Интеллектуальные инвестиции", ИНН 1655386205
 *       420107, РЕСПУБЛИКА ТАТАРСТАН, ГОРОД КАЗАНЬ, УЛИЦА СПАРТАКОВСКАЯ, ДОМ 2, ПОМЕЩЕНИЕ 119
 * (c) ООО "Интеллектуальные инвестиции", 2019
 */

import {Inject} from "typescript-ioc";
import Component from "vue-class-component";
import {Prop} from "vue-property-decorator";
import {namespace} from "vuex-class";
import {UI} from "../../app/ui";
import {DividendInfo, DividendService} from "../../services/dividendService";
import {TradeFields} from "../../services/tradeService";
import {AssetType} from "../../types/assetType";
import {BigMoney} from "../../types/bigMoney";
import {Operation} from "../../types/operation";
import {Portfolio, TableHeader} from "../../types/types";
import {CommonUtils} from "../../utils/commonUtils";
import {TradeUtils} from "../../utils/tradeUtils";
import {MutationType} from "../../vuex/mutationType";
import {StoreType} from "../../vuex/storeType";
import {AddTradeDialog} from "../dialogs/addTradeDialog";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-data-table class="data-table" :headers="headers" :items="rows" item-key="id" :custom-sort="customSort" hide-actions>
            <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
            <template #headerCell="props">
                <v-tooltip v-if="props.header.tooltip" content-class="custom-tooltip-wrap" bottom>
                    <template #activator="{ on }">
                        <span>
                            {{ props.header.text }}
                        </span>
                        <sup class="custom-tooltip" v-on="on">
                            <v-icon>fas fa-info-circle</v-icon>
                        </sup>
                    </template>
                    <span>
                      {{ props.header.tooltip }}
                    </span>
                </v-tooltip>
                <span v-else>
                    {{ props.header.text }}
                </span>
            </template>

            <template #items="props">
                <tr class="selectable">
                    <td class="text-xs-left">
                        <stock-link :ticker="props.item.ticker"></stock-link>
                    </td>
                    <td class="text-xs-left">{{ props.item.shortName }}</td>
                    <td class="text-xs-right">{{ props.item.date }}</td>
                    <td class="text-xs-right ii-number-cell">{{ props.item.quantity }}</td>
                    <td class="text-xs-right ii-number-cell">{{ props.item.perOne | amount(true) }}</td>
                    <td class="text-xs-right ii-number-cell">{{ props.item.amount | amount(true) }}</td>
                    <td class="text-xs-right ii-number-cell">{{ props.item.yield }}</td>
                    <td class="text-xs-left">{{ props.item.note }}</td>
                    <td class="justify-center px-0" @click.stop="openEditTradeDialog(props.item)">
                        <a>
                            <v-icon color="primary" small>fas fa-pencil-alt</v-icon>
                        </a>
                    </td>
                    <td class="justify-center" @click.stop="deleteDividendTrade(props.item)">
                        <a>
                            <v-icon color="primary" small>fas fa-trash-alt</v-icon>
                        </a>
                    </td>
                </tr>
            </template>
        </v-data-table>
    `
})
export class DividendTradesTable extends UI {

    @MainStore.Getter
    private portfolio: Portfolio;
    @MainStore.Action(MutationType.RELOAD_PORTFOLIO)
    private reloadPortfolio: (id: string) => Promise<void>;
    @Inject
    private dividendService: DividendService;

    private headers: TableHeader[] = [
        {text: "Тикер", align: "left", value: "ticker", width: "45"},
        {text: "Компания", align: "left", value: "shortName", width: "120"},
        {text: "Дата", align: "left", value: "date", width: "55"},
        {text: "Кол-во, шт.", align: "right", value: "quantity", width: "65"},
        {text: "На одну акцию", align: "right", value: "perOne", width: "65"},
        {text: "Сумма", align: "right", value: "amount", width: "65"},
        {
            text: "Доходность, %", align: "right", value: "yield", width: "80",
            tooltip: "Дивидендная доходность посчитанная по отношению к исторической цене акции на дату выплаты."
        },
        {text: "Заметка", align: "center", value: "note", width: "150"},
        {text: "", align: "center", value: "edit", sortable: false, width: "25"},
        {text: "", align: "center", value: "delete", sortable: false, width: "25"}
    ];

    @Prop({default: [], required: true})
    private rows: DividendInfo[];

    private async openEditTradeDialog(trade: DividendInfo): Promise<void> {
        const tradeFields: TradeFields = {
            ticker: trade.ticker,
            date: trade.date,
            quantity: trade.quantity,
            price: TradeUtils.decimal(trade.perOne),
            facevalue: null,
            nkd: null,
            perOne: true,
            fee: null,
            note: trade.note,
            keepMoney: CommonUtils.exists(trade.moneyTradeId),
            moneyAmount: trade.amount,
            currency: new BigMoney(trade.amount).currency
        };
        const result = await new AddTradeDialog().show({
            store: this.$store.state[StoreType.MAIN],
            router: this.$router,
            assetType: AssetType.STOCK,
            operation: Operation.DIVIDEND,
            tradeFields: tradeFields,
            tradeId: trade.id,
            editedMoneyTradeId: trade.moneyTradeId
        });
        if (result) {
            await this.reloadPortfolio(this.portfolio.id);
        }
    }

    private async deleteDividendTrade(dividendTrade: DividendInfo): Promise<void> {
        await this.dividendService.deleteTrade({tradeId: dividendTrade.id, portfolioId: this.portfolio.id});
        this.$snotify.info("Сделка успешно удалена");
    }

    private customSort(items: DividendInfo[], index: string, isDesc: boolean): DividendInfo[] {
        return TradeUtils.simpleSort(items, index, isDesc);
    }
}