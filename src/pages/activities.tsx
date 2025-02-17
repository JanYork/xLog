import { GetServerSideProps } from "next"
import { ReactElement, useState } from "react"
import { MainLayout } from "~/components/main/MainLayout"
import { UniLink } from "~/components/ui/UniLink"
import { Button } from "~/components/ui/Button"
import {
  useAccountState,
  useConnectedAction,
  useConnectModal,
} from "@crossbell/connect-kit"
import { useRefCallback } from "@crossbell/util-hooks"
import { getSiteLink } from "~/lib/helpers"
import { Image } from "~/components/ui/Image"
import { dehydrate, QueryClient } from "@tanstack/react-query"
import { prefetchGetSites } from "~/queries/site.server"
import { useGetSites } from "~/queries/site"
import showcase from "../../showcase.json"
import { CharacterFloatCard } from "~/components/common/CharacterFloatCard"
import { useAccountSites, useSubscribeToSites } from "~/queries/site"
import { useTranslation } from "next-i18next"
import { serverSideTranslations } from "next-i18next/serverSideTranslations"
import { languageDetector } from "~/lib/language-detector"
import { MainFeed } from "~/components/main/MainFeed"
import { Tabs } from "~/components/ui/Tabs"

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const queryClient = new QueryClient()
  await prefetchGetSites(showcase, queryClient)

  return {
    props: {
      ...(await serverSideTranslations(languageDetector(ctx), [
        "common",
        "index",
        "dashboard",
      ])),
      dehydratedState: dehydrate(queryClient),
    },
  }
}

function Activities() {
  const showcaseSites = useGetSites(showcase)
  const { t } = useTranslation("index")

  const userSite = useAccountSites()
  const subscribeToSites = useSubscribeToSites()

  const doSubscribeToSites = useRefCallback(() => {
    subscribeToSites.mutate({
      characterIds: showcaseSites.data
        ?.map((s: { characterId?: string }) => s.characterId)
        .filter(Boolean)
        .map(Number),
      siteIds: showcaseSites.data?.map((s: { handle: string }) => s.handle),
    } as any)
  })

  const followAll = useConnectedAction(() => {
    doSubscribeToSites()
  })

  const [showcaseMore, setShowcaseMore] = useState(false)

  const currentCharacterId = useAccountState(
    (s) => s.computed.account?.characterId,
  )
  const connectModal = useConnectModal()

  const [feedType, setFeedType] = useState<"latest" | "following">(
    userSite.data?.length ? "following" : "latest",
  )
  const tabs = [
    {
      text: "Latest",
      onClick: () => setFeedType("latest"),
      active: feedType === "latest",
    },
    {
      text: "Following",
      onClick: () => {
        if (!currentCharacterId) {
          connectModal.show()
        } else {
          setFeedType("following")
        }
      },
      active: feedType === "following",
    },
  ]

  return (
    <section className="pt-24">
      <div className="max-w-screen-lg px-5 mx-auto flex">
        <div className="flex-1 min-w-[300px]">
          <Tabs items={tabs} className="border-none text-lg"></Tabs>
          <MainFeed type={feedType} />
        </div>
        <div className="w-80 pl-10 pt-4 hidden sm:block">
          <div className="text-center">
            <div className="mb-10 text-zinc-700 space-y-3">
              <p className="font-medium">{t("Suggested creators for you")}</p>
              <Button
                onClick={followAll}
                isLoading={
                  showcaseSites.isLoading ||
                  userSite.isLoading ||
                  subscribeToSites.isLoading
                }
                isDisabled={subscribeToSites.isSuccess}
              >
                🥳{" "}
                {subscribeToSites.isSuccess
                  ? t("Already Followed All!")
                  : t("Follow All!")}
              </Button>
              <ul
                className={`overflow-y-clip relative text-left space-y-4 ${
                  showcaseMore ? "" : "max-h-[540px]"
                }`}
              >
                <div
                  className={`absolute bottom-0 h-14 left-0 right-0 bg-gradient-to-t from-white via-white flex items-end justify-center font-bold cursor-pointer z-[1] text-sm ${
                    showcaseMore ? "hidden" : ""
                  }`}
                  onClick={() => setShowcaseMore(true)}
                >
                  {t("Show more")}
                </div>
                {showcaseSites.data?.map((site: any) => (
                  <li className="flex align-middle" key={site.handle}>
                    <UniLink
                      href={getSiteLink({
                        subdomain: site.handle,
                      })}
                      className="inline-flex align-middle w-full"
                    >
                      <CharacterFloatCard siteId={site.handle}>
                        <span className="w-10 h-10 inline-block">
                          <Image
                            className="rounded-full"
                            src={
                              site.metadata.content?.avatars?.[0] ||
                              "ipfs://bafkreiabgixxp63pg64moxnsydz7hewmpdkxxi3kdsa4oqv4pb6qvwnmxa"
                            }
                            alt={site.handle}
                            width="40"
                            height="40"
                          ></Image>
                        </span>
                      </CharacterFloatCard>
                      <span className="ml-3 min-w-0 flex-1 justify-center inline-flex flex-col">
                        <span className="truncate w-full inline-block font-medium">
                          {site.metadata.content?.name}
                        </span>
                        {site.metadata.content?.bio && (
                          <span className="text-gray-500 text-xs truncate w-full inline-block mt-1">
                            {site.metadata.content?.bio}
                          </span>
                        )}
                      </span>
                    </UniLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

Activities.getLayout = (page: ReactElement) => {
  return <MainLayout>{page}</MainLayout>
}

export default Activities
