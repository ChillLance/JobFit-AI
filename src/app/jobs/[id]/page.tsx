import { StatusSelect } from './StatusSelect'
import { AnalyzeFitPanel } from './AnalyzeFitPanel'
import { ActiveProfileBanner } from './ActiveProfileBanner'
import {
  JobDetailHeader,
  JobDetailSections,
  JobNotFound,
} from './JobDetailUi'
import { findJob } from '@/lib/jobs/jobsRepository'
import { JOB_STATUSES, type JobStatus } from '@/types/domain'

function resolveStatus(status?: string): JobStatus {
  if (status && (JOB_STATUSES as readonly string[]).includes(status)) {
    return status as JobStatus
  }

  return 'not_applied'
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const job = findJob(id)

  if (!job) {
    return <JobNotFound id={id} />
  }

  const status = resolveStatus(job.status)

  return (
    <main className="min-h-screen bg-washi px-6 py-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <JobDetailHeader job={job} status={status} />

        <ActiveProfileBanner />

        <AnalyzeFitPanel
          jobId={job.id}
          initialDeepAnalysis={job.deepAnalysis ?? null}
          initialGroqAnalysis={job.groqAnalysis ?? null}
          initialOpenrouterAnalysis={job.openrouterAnalysis ?? null}
          initialLocalAnalysis={
            job.localAnalysis ?? job.analysis ?? job.aiScore ?? null
          }
        />

        <StatusSelect jobId={job.id} initialStatus={status} />

        <JobDetailSections job={job} />
      </div>
    </main>
  )
}
