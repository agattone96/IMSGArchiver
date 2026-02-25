import { MessageTimeline } from '../components/MessageTimeline';

type EditHistoryProps = {
    mirrorEnabled: boolean;
};

export function EditHistory({ mirrorEnabled }: EditHistoryProps) {
    return (
        <MessageTimeline
            heading="Edit History"
            description="Track textual mutations over time with semantic insertions and deletions."
            restrictedReason="Blueprint restricted state: Enable Forensic Mirror Mode in Settings to unlock Edit History."
            mirrorEnabled={mirrorEnabled}
        />
    );
}
