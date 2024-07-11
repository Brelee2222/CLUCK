import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt'
import type { WebClient } from '@slack/web-api'
import { Blocks, Elements, HomeTab } from 'slack-block-builder'
import { calculateHours } from '~lib/hour_operations'
import { ActionIDs } from '~slack/handlers'

export async function handleAppHomeOpened({ body, event, client }: SlackEventMiddlewareArgs<'app_home_opened'> & AllMiddlewareArgs) {
    // Don't update when the messages tab is opened
    if (body.event.tab == 'home') {
        await publishDefaultHomeView(event.user, client)
    }
}

export async function publishDefaultHomeView(user: string, client: WebClient) {
    const hours = (await calculateHours({ slack_id: user }))!

    const homeTab = HomeTab().blocks(
        Blocks.Actions().elements(
            Elements.Button().text('Log Hours').actionId(ActionIDs.OPEN_LOG_MODAL),
            Elements.Button().text('Show Info').actionId(ActionIDs.OPEN_USERINFO_MODAL)
        ),
        Blocks.Header().text('⏳ Your Hours'),
        Blocks.Section().fields('*Category*', '*Hours*'),
        Blocks.Divider(),
        Blocks.Section().fields('Lab', hours.lab.toFixed(1)),
        Blocks.Divider(),
        Blocks.Section().fields('External', hours.external.toFixed(1)),
        Blocks.Divider(),
        Blocks.Section().fields('Event', hours.event.toFixed(1)),
        Blocks.Divider(),
        Blocks.Section().fields('Summer', hours.summer.toFixed(1)),
        Blocks.Divider(),
        Blocks.Section().fields('*Total*', '*' + hours.total.toFixed(1) + '*'),
        Blocks.Divider(),
        Blocks.Context().elements('Last updated ' + new Date().toLocaleTimeString())
    )

    await client.views.publish({
        user_id: user,
        view: homeTab.buildToObject()
    })
}
