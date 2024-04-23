import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

const eventbridge = new EventBridgeClient({ apiVersion: "2015-10-07" });

export const handler = async (event) => {
  console.log(JSON.stringify(event));

  await eventbridge.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: "org.prx.auto-scaling-toolkit",
          DetailType: "Slack Message Relay Message Payload",
          Detail: JSON.stringify({
            username: "AWS Auto Scaling",
            icon_emoji: ":ops-autoscaling:",
            channel: "#sandbox2",
            mrkdwn: true,
            text: `\`${JSON.stringify(event)}\``,
          }),
        },
      ],
    }),
  );
};
