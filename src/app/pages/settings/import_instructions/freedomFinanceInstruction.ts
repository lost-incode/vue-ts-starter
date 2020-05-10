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

import {Component, UI} from "../../../app/ui";

@Component({
    // language=Vue
    template: `
        <div>
            Перейдите в online-терминал. Перейдите на вкладку <b>Сделки</b>

            <v-img :src="IMAGES[0]" max-width="980" class="grey darken-4 image"></v-img>

            Для получения отчета нажмите Экспорт в Excel<br>
            Полученный файл используйте для импорта.
        </div>
    `
})
export class FreedomFinanceInstruction extends UI {

    private IMAGES: string[] = [
        "./img/import_instructions/freedom_finance/1.png",
    ];

}
