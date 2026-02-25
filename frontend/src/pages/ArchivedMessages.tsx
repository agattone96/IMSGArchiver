import { MessageTimeline } from '../components/MessageTimeline';

type ArchivedMessagesProps = {
    mirrorEnabled: boolean;
};

export function ArchivedMessages({ mirrorEnabled }: ArchivedMessagesProps) {
    return (
        <MessageTimeline
            heading="Archived Messages"
            description="Query mirror revisions by GUID and inspect archived message history."
            restrictedReason="Blueprint restricted state: Enable Forensic Mirror Mode in Settings to unlock Archived Messages."
            mirrorEnabled={mirrorEnabled}
        />
    );
}
