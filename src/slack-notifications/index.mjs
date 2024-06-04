import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import regions from "./regions.mjs";

const eventbridge = new EventBridgeClient({ apiVersion: "2015-10-07" });

export const handler = async (event) => {
  console.log(JSON.stringify(event));

  let color = "#53adfb";
  if (/Successful/.test(event["detail-type"])) {
    color = "#2eb886";
  }
  if (/Unsuccessful/.test(event["detail-type"])) {
    color = "#a30200";
  }

  const asgUrl = `https://console.aws.amazon.com/ec2autoscaling/home?region=${event.region}#/details/${event.detail.AutoScalingGroupName}?view=details`;
  const instanceUrl = `https://console.aws.amazon.com/ec2/v2/home?region=${event.region}#InstanceDetails:instanceId=${event.detail.EC2InstanceId}`;

  let environment = "????";
  if (event.detail.AutoScalingGroupName.includes("prod")) {
    environment = "prod";
  } else if (event.detail.AutoScalingGroupName.includes("stag")) {
    environment = "stag";
  }

  const lines = [];
  let inOut = "";

  let az = "";
  if (event?.detail?.Details?.["Availability Zone"]) {
    az = ` in \`${event.detail.Details["Availability Zone"]}\``;
  }

  lines.push(`*Instance:* <${instanceUrl}|${event.detail.EC2InstanceId}>${az}`);

  if (/capacity from [0-9]+ to [0-9]+/.test(event.detail.Cause)) {
    const m = event.detail.Cause.match(/capacity from ([0-9]+) to ([0-9]+)/);
    lines.push(`*Capacity change:* \`${m[1]}\` to \`${m[2]}\``);

    inOut = +m[1] > +m[2] ? " IN" : " OUT";
  } else if (
    /an instance was taken out of service in response to a user health-check/.test(
      event.detail.Cause,
    )
  ) {
    lines.push("Taken out of service in response to a user health-check.");
  } else if (
    /was taken out of service in response to a user request/.test(
      event.detail.Cause,
    )
  ) {
    lines.push("Taken out of service in response to a user request.");
  }

  await eventbridge.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: "org.prx.auto-scaling-toolkit",
          DetailType: "Slack Message Relay Message Payload",
          Detail: JSON.stringify({
            username: "AWS Auto Scaling",
            icon_emoji: ":ops-autoscaling:",
            channel: "G2QHC11SM", // #ops-debug
            mrkdwn: true,
            attachments: [
              {
                color,
                fallback: `SCALE${inOut} | ${regions[event.region]} » ASG &lt;${environment}&gt; ${event["detail-type"].toUpperCase()}`,
                blocks: [
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: `*<${asgUrl}|SCALE${inOut} | ${regions[event.region]} » ASG &lt;${environment}&gt; ${event["detail-type"].toUpperCase()}>*`,
                    },
                  },
                  {
                    type: "section",
                    text: {
                      type: "mrkdwn",
                      text: lines.join("\n"),
                    },
                  },
                ],
              },
            ],
          }),
        },
      ],
    }),
  );
};
