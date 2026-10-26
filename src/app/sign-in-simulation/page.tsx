import { recordSimulationSubmission } from './actions'
import Image from 'next/image'

export default async function SignInSimulationPage({
    searchParams,
}: {
    searchParams: Promise<{ campaignId: string; email: string }>
}) {
    const { campaignId, email } = await searchParams

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
            <div className="w-full max-w-[440px] bg-white p-10 shadow-lg sm:rounded-lg">
                <div className="mb-6">
                    <Image
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/1280px-Microsoft_logo_%282012%29.svg.png"
                        alt="Microsoft"
                        width={108}
                        height={23}
                        className="mb-4"
                    />
                    <h1 className="text-2xl font-semibold text-[#1b1b1b]">Sign in</h1>
                </div>

                <form action={recordSimulationSubmission} className="space-y-4">
                    <input type="hidden" name="campaignId" value={campaignId || ''} />
                    <input type="hidden" name="targetEmail" value={email || ''} />

                    <div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email, phone, or Skype"
                            defaultValue={email || ''}
                            className="w-full border-b border-[#8f8f8f] py-2 text-base focus:border-[#0067b8] focus:outline-none placeholder-[#666666]"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="w-full border-b border-[#8f8f8f] py-2 text-base focus:border-[#0067b8] focus:outline-none placeholder-[#666666]"
                            required
                        />
                    </div>

                    <div className="flex justify-end mt-8">
                        <button
                            type="submit"
                            className="bg-[#0067b8] text-white px-8 py-2 font-semibold hover:bg-[#005da6] transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
