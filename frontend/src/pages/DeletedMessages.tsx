import { MessageTimeline } from '../components/MessageTimeline';

type DeletedMessagesProps = {
    mirrorEnabled: boolean;
};

export function DeletedMessages({ mirrorEnabled }: DeletedMessagesProps) {
    return (
        <MessageTimeline
            heading="Deleted Messages"
            description="Review mirrored revisions and identify redacted or removed content."
            restrictedReason="Blueprint restricted state: Enable Forensic Mirror Mode in Settings to unlock Deleted Messages."
            mirrorEnabled={mirrorEnabled}
        />
    );
}
