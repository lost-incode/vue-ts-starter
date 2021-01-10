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
import {namespace} from "vuex-class";
import {Component, Prop, UI} from "../../app/ui";
import {DisableConcurrentExecution} from "../../platform/decorators/disableConcurrentExecution";
import {ShowProgress} from "../../platform/decorators/showProgress";
import {BtnReturn} from "../../platform/dialogs/customDialog";
import {Filters} from "../../platform/filters/Filters";
import {ClientService} from "../../services/clientService";
import {DividendInfo, DividendService} from "../../services/dividendService";
import {OverviewService} from "../../services/overviewService";
import {PortfolioParams} from "../../services/portfolioService";
import {TradeFields, TradeService} from "../../services/tradeService";
import {AssetType} from "../../types/assetType";
import {BigMoney} from "../../types/bigMoney";
import {Operation} from "../../types/operation";
import {Portfolio, ShareType, TableHeader} from "../../types/types";
import {CommonUtils} from "../../utils/commonUtils";
import {DateFormat} from "../../utils/dateUtils";
import {PortfolioUtils} from "../../utils/portfolioUtils";
import {SortUtils} from "../../utils/sortUtils";
import {TradeUtils} from "../../utils/tradeUtils";
import {MutationType} from "../../vuex/mutationType";
import {StoreType} from "../../vuex/storeType";
import {AddTradeDialog} from "../dialogs/addTradeDialog";
import {ConfirmDialog} from "../dialogs/confirmDialog";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-data-table class="data-table" :headers="headers" :items="rows" item-key="id" :custom-sort="customSort" hide-actions must-sort>
            <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
            <template #headerCell="props">
                <v-tooltip v-if="props.header.tooltip" content-class="custom-tooltip-wrap" bottom>
                    <template #activator="{ on }">
                        <span class="data-table__header-with-tooltip" v-on="on">
                            {{ props.header.text }}
                        </span>
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
                    <td class="text-xs-right">{{ getTradeDate(props.item.date) }}</td>
                    <td class="text-xs-right ii-number-cell">{{ props.item.quantity | integer }}</td>
                    <td class="text-xs-right ii-number-cell">
                        {{ props.item.perOne | amount(true) }}&nbsp;<span class="second-value">{{ props.item.perOne | currencySymbol }}
                    </span></td>
                    <td class="text-xs-right ii-number-cell">
                        {{ props.item.amount | amount(true) }}&nbsp;<span class="second-value">{{ props.item.amount | currencySymbol }}</span>
                    </td>
                    <td class="text-xs-right ii-number-cell">{{ props.item.yield }}&nbsp;<span class="second-value">%</span></td>
                    <td class="text-xs-left">{{ props.item.note }}</td>
                    <td v-if="allowActions" class="px-0">
                        <v-layout align-center justify-center>
                            <v-menu transition="slide-y-transition" bottom right>
                                <v-btn slot="activator" flat icon dark>
                                    <span class="menuDots"></span>
                                </v-btn>
                                <v-list dense>
                                    <v-list-tile @click.stop="openEditTradeDialog(props.item)">
                                        <v-list-tile-title>
                                            Редактировать
                                        </v-list-tile-title>
                                    </v-list-tile>
                                    <v-list-tile @click.stop="deleteDividendTrade(props.item)">
                                        <v-list-tile-title class="delete-btn">
                                            Удалить
                                        </v-list-tile-title>
                                    </v-list-tile>
                                </v-list>
                            </v-menu>
                        </v-layout>
                    </td>
                </tr>
            </template>
        </v-data-table>
    `
})
export class DividendTradesTable extends UI {

    private static readonly ACTION_HEADER = {text: "", align: "center", value: "action", sortable: false, width: "50"};

    @Inject
    private overviewService: OverviewService;
    @MainStore.Getter
    private portfolio: Portfolio;
    /** Комбинированный портфель */
    @MainStore.Getter
    private combinedPortfolioParams: PortfolioParams;
    @MainStore.Action(MutationType.RELOAD_CURRENT_PORTFOLIO)
    private reloadPortfolio: () => Promise<void>;
    @Inject
    private dividendService: DividendService;
    @Inject
    private tradesService: TradeService;
    @Inject
    private clientService: ClientService;

    /** Заголовки таблицы */
    private headers: TableHeader[] = [
        {text: "Тикер", align: "left", value: "ticker", width: "45"},
        {text: "Компания", align: "left", value: "shortName", width: "120"},
        {text: "Дата", align: "left", value: "date", width: "55"},
        {text: "Кол-во, шт.", align: "right", value: "quantity", width: "65"},
        {text: "На одну бумагу", align: "right", value: "perOne", width: "65"},
        {text: "Сумма", align: "right", value: "amount", width: "65"},
        {
            text: "Доходность, %", align: "right", value: "yield", width: "80",
            tooltip: "Доходность посчитанная по отношению к исторической цене бумаги на дату выплаты."
        },
        {text: "Заметка", align: "center", value: "note", width: "150"},
    ];

    @Prop({default: [], required: true})
    private rows: DividendInfo[];
    /** Признак доступности профессионального режима */
    private portfolioProModeEnabled = false;

    /**
     * Инициализация данных
     * @inheritDoc
     */
    async created(): Promise<void> {
        const clientInfo = await this.clientService.getClientInfo();
        this.portfolioProModeEnabled = TradeUtils.isPortfolioProModeEnabled(this.portfolio, clientInfo);
        if (this.allowActions) {
            this.headers.push(DividendTradesTable.ACTION_HEADER);
        }
    }

    private async openEditTradeDialog(trade: DividendInfo): Promise<void> {
        const currency = new BigMoney(trade.amount).currency;
        const shareType = AssetType.valueByName(trade.shareType);
        const tradeFields: TradeFields = {
            ticker: String(trade.shareId),
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
            currency: currency,
            feeCurrency: currency,
        };
        await new AddTradeDialog().show({
            store: this.$store.state[StoreType.MAIN],
            router: this.$router,
            assetType: shareType,
            operation: trade.shareType === ShareType.BOND ? Operation.COUPON : Operation.DIVIDEND,
            tradeFields: tradeFields,
            tradeId: trade.id,
            editedMoneyTradeId: trade.moneyTradeId
        });
    }

    private async deleteDividendTrade(dividendTrade: DividendInfo): Promise<void> {
        const result = await new ConfirmDialog().show(`Вы уверены, что хотите удалить дивидендную сделку по акции ${dividendTrade.ticker}?`);
        if (result === BtnReturn.YES) {
            await this.deleteDividendTradeAndShowMessage(dividendTrade);
        }
    }

    @ShowProgress
    @DisableConcurrentExecution
    private async deleteDividendTradeAndShowMessage(dividendTrade: DividendInfo): Promise<void> {
        await this.tradesService.deleteTrade({tradeId: dividendTrade.id, portfolioId: this.portfolio.id});
        this.resetCombinedOverviewCache(this.portfolio.id);
        await this.reloadPortfolio();
        this.$snotify.info("Сделка успешно удалена");
    }

    private customSort(items: DividendInfo[], index: string, isDesc: boolean): DividendInfo[] {
        return SortUtils.simpleSort(items, index, isDesc);
    }

    private getTradeDate(dateString: string): string {
        const date = TradeUtils.getDateString(dateString);
        const time = TradeUtils.getTimeString(dateString);
        return this.portfolioProModeEnabled && !!time ? Filters.formatDate(`${date} ${time}`, DateFormat.DATE_TIME) : Filters.formatDate(date, DateFormat.DATE);
    }

    private resetCombinedOverviewCache(portfolioId: number): void {
        PortfolioUtils.resetCombinedOverviewCache(this.combinedPortfolioParams, portfolioId, this.overviewService);
    }

    private get allowActions(): boolean {
        return !this.portfolio.portfolioParams.combinedFlag;
    }
}
