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

/** Структура данных параметров для URL */
import {Inject, Singleton} from "typescript-ioc";
import {BlockByTariffDialog} from "../../components/dialogs/blockByTariffDialog";
import {ForbiddenDialog} from "../../components/dialogs/forbiddenDialog";
import {StoreKeys} from "../../types/storeKeys";
import {ErrorInfo, ForbiddenCode, MapType} from "../../types/types";
import {CommonUtils} from "../../utils/commonUtils";
import {Service} from "../decorators/service";
import {Storage} from "./storage";

export type UrlParams = {
    [key: string]: string | number | boolean | string[]
};

/**
 * Сервис HTTP-транспорта
 */
@Service("Http")
@Singleton
export class Http {

    @Inject
    private localStorage: Storage;

    /** Ключ заголовка в ответе для необходимости обновления однодневного токена */
    private readonly NEED_TO_REFRESH_TOKEN_HEADER = "__CALL_REFRESH_TOKEN__";
    /** Ключ заголовка источника запроса */
    private readonly SOURCE_HEADER_KEY = "Request-source";

    private readonly BASE_URL: string = `${window.location.protocol}//${window.location.host}/api`;

    get importHeaders(): MapType {
        const token = this.localStorage.get(StoreKeys.TOKEN_KEY, null);
        if (!CommonUtils.isBlank(token)) {
            const headers: MapType = {"Authorization": `Bearer ${token}`};
            headers[this.SOURCE_HEADER_KEY] = "WEB";
            const refreshToken = this.localStorage.get(StoreKeys.REFRESH_TOKEN, null);
            if (!CommonUtils.isBlank(refreshToken)) {
                headers[StoreKeys.REFRESH_TOKEN] = refreshToken;
            }
            return headers;
        }
        return {};
    }

    /**
     * Выполнить POST-запрос на {@code url} с телом {@code body} и параметрами {@code options}
     * @param {string} url URL запроса
     * @param body         тело запроса
     * @param urlParams
     * @param options      параметры запроса
     * @return {Promise<T>}
     */
    async post<T>(url: string, body?: any, urlParams?: UrlParams, options?: any): Promise<T> {
        return this.doRequest<T>("POST", url, {options, urlParams, body});
    }

    /**
     * Выполнить PUT-запрос на {@code url} с телом {@code body} и параметрами {@code options}
     * @param {string} url URL запроса
     * @param body         тело запроса
     * @param options      параметры запроса
     * @return {Promise<T>}
     */
    async put<T>(url: string, body?: any, options?: any): Promise<T> {
        return this.doRequest<T>("PUT", url, {options, body});
    }

    /**
     * Выполнить GET-запрос на {@code url} c параметрами для URL {@code urlParams} и параметрами запроса {@code options}
     * @param {string} url URL запроса
     * @param urlParams    параметры для URL
     * @param options      параметры запроса
     * @param customBaseUrl
     * @return {Promise<T>}
     */
    async get<T>(url: string, urlParams?: UrlParams, options?: any, customBaseUrl: boolean = false): Promise<T> {
        return this.doRequest<T>("GET", url, {options, urlParams}, customBaseUrl);
    }

    /**
     * Выполнить DELETE-запрос на {@code url} c параметрами для URL {@code urlParams} и параметрами запроса {@code options}
     * @param {string} url URL запроса
     * @param urlParams    параметры для URL
     * @param options      параметры запроса
     * @return {Promise<T>}
     */
    async delete<T>(url: string, urlParams?: UrlParams, options?: any): Promise<T> {
        return this.doRequest<T>("DELETE", url, {options, urlParams});
    }

    /**
     * Выполнить запрос на сервис
     * @param method метод запроса
     * @param url    URL запроса
     * @param params объект с параметрами запроса
     * @param customBaseUrl если признак передан, url буден взять напрямую без base_url
     * @return {Promise<T>}
     */
    private async doRequest<T>(method: string, url: string, params: { options: any, body?: any, urlParams?: UrlParams }, customBaseUrl: boolean = false): Promise<T> {
        const paramsInit = this.prepareRequestParams(method, url, params, customBaseUrl);

        let response;
        try {
            response = await fetch(paramsInit.url, paramsInit.params);
        } catch (networkError) {
            throw new Error("Не удалось выполнить запрос, повторите позже");
        }

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return this.parseResult<T>(response);
    }

    /**
     * Подготовить запрос
     * @param method метод запроса
     * @param requestUrl    URL запроса
     * @param params объект с параметрами, которые необходимо применить к запросу
     * @param customBaseUrl
     * @return {ParamsInit} объект с данными запроса
     */
    private prepareRequestParams(method: string, requestUrl: string, params: { options: any, body?: any, urlParams?: UrlParams }, customBaseUrl: boolean = false): ParamsInit {
        let url = requestUrl;
        const requestParams = this.getDefaultRequestInit(params);
        requestParams.method = method;

        if (params.options) {
            this.setRequestInitOptions(requestParams, params.options);
        }

        if (params.body) {
            this.setRequestInitBody(requestParams, params.body);
        }

        if (params.urlParams) {
            url += this.buildQuery(params.urlParams);
        }

        if (url.charAt(0) !== "/") {
            url = "/" + url;
        }

        return {url: customBaseUrl ? url : this.BASE_URL + url, params: requestParams};
    }

    /**
     * Создать запрос
     * @param urlParams параметры для URL запроса
     * @return {string} готовый запрос
     */
    private buildQuery(urlParams: UrlParams): string {
        return Object.keys(urlParams).reduce((query: string, key: string, idx: number, keys: string[]) => {
            let resultQuery = query;
            if (urlParams[key] instanceof Array) {
                resultQuery += this.arrayToQueryString(key, urlParams[key] as string[]);
            } else {
                resultQuery += encodeURIComponent(key) + "=" + encodeURIComponent(String(urlParams[key]));
            }
            if (idx < keys.length - 1) {
                resultQuery += "&";
            }
            return resultQuery;
        }, "?");
    }

    /**
     * Установить тело запроса
     * @param requestInit параметры запроса
     * @param body        данные для установки
     */
    private setRequestInitBody(requestInit: RequestInit, body: any): void {
        let resultBody = body;
        if (typeof resultBody !== "string" && !(resultBody instanceof FormData)) {
            resultBody = JSON.stringify(resultBody);
        }
        requestInit.body = resultBody;
    }

    /**
     * Установить параметры в данные запроса (кроме body и method, тк они передаются и устанавливаются отдельно)
     * @param requestInit данные запроса
     * @param options     параметры запроса
     */
    private setRequestInitOptions(requestInit: RequestInit, options: any): void {
        if (options.cache) {
            requestInit.cache = options.cache;
        }
        if (options.credentials) {
            requestInit.credentials = options.credentials;
        }
        if (options.headers) {
            requestInit.headers = options.headers;
        }
    }

    /**
     * Обработка ответа сервиса
     * @param response ответ сервиса
     * @return {Promise<T | undefined>} преобразованный ответа сервиса в зависимости от его контента или {@code undefined}
     */
    private async parseResult<T>(response: Response): Promise<T | undefined> {
        await this.reNewRefreshToken(response);
        const contentType = response.headers.get("Content-Type");
        // Код 204 - запрос успешно выполнился, контента нет
        if (response.status === 204 || contentType === null) {
            return undefined;
        }
        if (contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        if (contentType.indexOf("text/plain") !== -1) {
            return response.text() as Promise<any>;
        }
        // для экспорта файлов
        if (contentType.indexOf("application/octet-stream") !== -1) {
            return response as any;
        }

        throw new Error("Неподдерживаемый тип контента " + contentType);
    }

    private async reNewRefreshToken(response: Response): Promise<void> {
        const needToReNewRefreshToken = response.headers.get(this.NEED_TO_REFRESH_TOKEN_HEADER) === "true";
        if (needToReNewRefreshToken) {
            try {
                const paramsInit = this.prepareRequestParams("GET", "/user/refresh-token/WEB", {options: null}, false);
                const tokenResponse = await fetch(paramsInit.url, paramsInit.params);
                const refreshToken = await tokenResponse.text();
                this.localStorage.set(StoreKeys.REFRESH_TOKEN, refreshToken);
            } catch (networkError) {
                throw new Error("Не удалось выполнить запрос, повторите позже");
            }
        }
    }

    /**
     * Возвращает пользовательские параметры, которые необходимо применить к запросу по умолчанию
     * @param params объект с параметрами для проверки и формирования заголовков к запросу по умолчанию
     * @return {RequestInit} пользовательские параметры по умолчанию
     */
    private getDefaultRequestInit(params: RequestInit): RequestInit {
        const headers: HeadersInit = {
            "Accept-Language": "ru_RU"
        };
        if (!(params.body instanceof FormData)) {
            headers["Content-Type"] = "application/json;charset=UTF-8";
        }
        headers[this.SOURCE_HEADER_KEY] = "WEB";
        const token = this.localStorage.get(StoreKeys.TOKEN_KEY, null);
        if (!CommonUtils.isBlank(token)) {
            headers.Authorization = `Bearer ${token}`;
        }
        const refreshToken = this.localStorage.get<string>(StoreKeys.REFRESH_TOKEN, null);
        if (!CommonUtils.isBlank(refreshToken)) {
            headers[StoreKeys.REFRESH_TOKEN] = refreshToken;
        }
        return {
            /** параметр передачи учетных данных в запросе */
            credentials: "same-origin",
            /** заголовки запроса */
            headers: headers
        };
    }

    /**
     * Обработка ошибок в ответе сервиса
     * @param response ответ сервиса
     * @return объект с ошибкой
     */
    private async handleError(response: Response): Promise<any> {
        if (response.status === 401) {
            // при неавторизованном обращении отправляем пользователя на форму входа
            this.localStorage.delete(StoreKeys.TOKEN_KEY);
            window.location.assign(location.origin + location.pathname);
            throw new Error("Доступ запрещен");
        }
        let responseError = null;
        let error: any = new Error("Внутренняя ошибка сервера");
        try {
            responseError = await response.json();
            // кастомный тип с описанием ошибок и полями
            const errorInfo = this.makeErrorInfo(responseError);
            if (errorInfo) {
                return errorInfo;
            }
            if (responseError.message) {
                error = new Error(responseError.message);
            }
            if (responseError.code) {
                error.code = responseError.code;
            }
            if (responseError.captured) {
                error.captured = responseError.captured;
            }
        } catch (e) {
            // пришел ответ, отличный от json
        }
        if (response.status === 403) {
            // при запрете доступа отображаем соответствующий диалог
            const reason = await this.makeForbiddenError(responseError);
            if (reason) {
                reason === ForbiddenCode.DEMO_MODE ? await new ForbiddenDialog().show() : await new BlockByTariffDialog().show(reason);
            }
        }
        error.response = {
            status: response.status,
            statusText: response.statusText
        };
        return error;
    }

    /**
     * Преобразует массив строк к виду key=value1&key=value2&key=value3 и т.д
     * @param key
     * @param urlPrams
     */
    private arrayToQueryString(key: string, urlPrams: string[]): string {
        const out: string[] = [];
        urlPrams.forEach((value: string, index: number): void => {
            out.push(encodeURIComponent(key) + "=" + encodeURIComponent(urlPrams[index]));
        });
        return out.join("&");
    }

    private makeErrorInfo(responseError: any): ErrorInfo {
        if (CommonUtils.isUserError(responseError)) {
            return responseError as ErrorInfo;
        }
        return null;
    }

    private async makeForbiddenError(response: any): Promise<ForbiddenCode> {
        try {
            if (response.message) {
                return ForbiddenCode.valueByName(response.message);
            }
        } catch (e) {
            // пришел ответ, отличный от json
        }
        return null;
    }
}

/** Структура данных запроса */
type ParamsInit = {
    /** URL запроса */
    url: string,
    /** Параметры, которые необходимо применить к запросу */
    params: RequestInit
};
