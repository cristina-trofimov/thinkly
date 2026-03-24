import type { QuestionInstance } from "@/types/questions/QuestionInstance.type"
import { logFrontend } from "../../api/LoggerAPI"
import type { Question } from "@/types/questions/QuestionPagination.type"
import type { Competition } from "@/types/competition/Competition.type"
import type { BaseEvent } from "@/types/BaseEvent.type"
import { useEffect, useRef, useState } from "react"
import type { Language } from "@/types/questions/Language.type"
import type { UserPreferences } from "@/types/account/UserPreferences.type"
import { getEventByName } from "@/api/BaseEventAPI"
import { toast } from "sonner"
import { getAllQuestionInstancesByEventID, getQuestionInstance, putQuestionInstance } from "@/api/QuestionInstanceAPI"
import { getAllLanguages } from "@/api/LanguageAPI"
import { getUserPrefs } from "@/api/UserPreferencesAPI"
import { getQuestionByID } from "@/api/QuestionsAPI"
import { useTestcases } from "./useTestcases"
import type { MostRecentSub } from "@/types/submissions/MostRecentSub.type"
import { getUserInstance, putUserInstance } from "@/api/UserQuestionInstanceAPI"
import type { UserQuestionInstance } from "@/types/submissions/UserQuestionInstance.type"
import { useUser } from "@/context/UserContext"


export function useCodingHooks(question?: Question, comp?: Competition) {
    const [ languages, setLanguages ] = useState<Language[]>()
    const [ selectedLang, setSelectedLang ] = useState<Language>()
    // Keep a ref to the previous language so we can log "from → to" on change
    const prevLangRef = useRef<Language | null>(null)

    const [ questions, setQuestions ] = useState<Question[]>([])
    const [ event, setEvent ] = useState<BaseEvent | undefined | null>(null)
    const [ activeQuestion, setActiveQuestion ] = useState<Question>()
    const [ questionsInstances, setQuestionsInstances ] = useState<QuestionInstance[]>([])
    const [ activeQuestionInstance, setActiveQuestionInstance ] = useState<QuestionInstance>()

    const [ userPreferences, setUserPreferences ] = useState<UserPreferences>()
    const [ userQuestionInstance, setUserQuestionInstance ] = useState<UserQuestionInstance | undefined>()

    const [ startTime, setStartTime ] = useState<Date | null>()

    const [ activeDisplayQuestionName, setActiveDisplayQuestionName ] = useState<string>("Question 1")

    const [ isQuestionLoading, setIsQuestionLoading ] = useState<boolean>(false)
    const [ isAsyncLoading, setIsAsyncLoading ] = useState<boolean>(false)
    const [ loadingMsg, setLoadingMsg ] = useState<string>("")

    const [ mostRecentSub, setMostRecentSub ] = useState<MostRecentSub>()
    const [ mostRecentSubGroupClass, setMostRecentSubGroupClass ] = useState<string>('grid grid-cols-2 gap-4')

    const { testcases } = useTestcases(activeQuestionInstance?.question_id)

    const { user } = useUser()


    // Getting the competition or algotime event if it exists
    useEffect(() => {
        if(comp?.id) {
            const InitializeCompEvent = async () => {
                setIsQuestionLoading(true)
                try {
                    await getEventByName(comp?.competitionTitle)
                        .then((response) => setEvent(response))
                } catch (err) {
                    toast.error("Error when fetching competition event.")
                    logFrontend({
                        level: "ERROR",
                        message: `Failed to fetch competition event. Reason: ${err}`,
                        component: "CodingHooks",
                        url: globalThis.location.href,
                        stack: (err as Error).stack,
                    })
                } finally {
                    setIsQuestionLoading(false)
                }
            }
            InitializeCompEvent()
        }
    }, [comp?.id, comp?.competitionTitle])

    // Getting the question instance (if it's a practice question and no event was passed)
    // Or all the question instances associated to the given event
    useEffect(() => {
        if (event) {
            const InitializeQuestionInstances = async () => {
                setIsQuestionLoading(true)
                try {
                    await getAllQuestionInstancesByEventID(event?.event_id)
                        .then((response) => setQuestionsInstances(response))
                } catch (err) {
                    toast.error("Error when fetching event's question instances.")
                    logFrontend({
                        level: "ERROR",
                        message: `Failed to fetch event's question instances. Reason: ${err}`,
                        component: "CodingHooks",
                        url: globalThis.location.href,
                        stack: (err as Error).stack,
                    })
                } finally {
                    setIsQuestionLoading(false)
                }
            }
            InitializeQuestionInstances()
        } else if(question?.question_id) {
            const initQuestion = async () => {
                setIsQuestionLoading(true)
                try {
                    const [questionInstance, fullQuestion] = await Promise.all([
                        getQuestionInstance(question.question_id, null),
                        getQuestionByID(question.question_id)
                    ])
                    setQuestions([fullQuestion])

                    if (questionInstance) {
                        setQuestionsInstances([questionInstance])
                    } else {
                        await putQuestionInstance(undefined, question?.question_id, null, null)
                            .then((response) => setQuestionsInstances([response]))
                    }
                } catch (err) {
                    toast.error("Error when fetching question instance.")
                    logFrontend({
                        level: "ERROR",
                        message: `Failed to fetch question instance. Reason: ${err}`,
                        component: "CodingHooks",
                        url: globalThis.location.href,
                        stack: (err as Error).stack,
                    })
                } finally {
                    setIsQuestionLoading(false)
                }
            }
            initQuestion()
        }
    }, [event, question?.question_id])

    // If an event is passed, get all the associated questions' details
    useEffect(() => {
        if (!questionsInstances?.length || questions.length >= questionsInstances.length) return

        const fetchQuestions = async () => {
            setIsQuestionLoading(true)
            try {
                // Fetch all in parallel
                const questionPromises = questionsInstances.map(qi => getQuestionByID(qi.question_id) )
                const fetchedResponses = await Promise.all(questionPromises)

                setQuestions(fetchedResponses)
            } catch (err) {
                toast.error("Error when fetching questions.")
                logFrontend({
                    level: "ERROR",
                    message: `Failed to fetch questions. Reason: ${err}`,
                    component: "CodingHooks",
                    url: globalThis.location.href,
                    stack: (err as Error).stack,
                })
            } finally {
                setIsQuestionLoading(false)
            }
        }
        fetchQuestions()
    }, [questionsInstances, questions.length])

    // Setting the default active question and question instance
    // Then loads all active languages and user's preferences
    useEffect(() => {
        if (questions.length > 0 && !activeQuestion) {
            setActiveQuestion(questions[0])
        }
        if (questionsInstances.length > 0 && !activeQuestionInstance) {
            setActiveQuestionInstance(questionsInstances[0])
        }
        const loadLanguagesAndPrefs = async () => {
            try {

                if (user) {
                    const [langs, userPrefs] = await Promise.all([
                        getAllLanguages(true),
                        getUserPrefs(user?.id),
                    ])

                    setLanguages(langs)
                    setUserPreferences(userPrefs)
                }

            } catch (error) {
                toast.error("Error when fetching languages.")
                logFrontend({
                    level: "ERROR",
                    message: `Failed to fetch languages. Reason: ${error}`,
                    component: "CodingHooks",
                    url: globalThis.location.href,
                    stack: (error as Error).stack,
                })
            }
        }
        loadLanguagesAndPrefs()
    }, [questions, questionsInstances, activeQuestion, activeQuestionInstance])

    useEffect(() => {
        if (!languages || languages.length < 1) return

        const savedLang = languages.find(lang => lang.lang_judge_id === userPreferences?.last_used_programming_language)

        setSelectedLang(savedLang || languages[0])
        prevLangRef.current = savedLang || languages[0]
    }, [languages, userPreferences])


    // switches current userQuestionInstance and lapse time when the user switches questions
    useEffect(() => {
        if (!activeQuestionInstance) return

        // Get or create new user question instance
        // Restart time lapse
        const getOrCreateUserQuestionInstance = async () => {
            try {
                if (user) {
                    const uqi = await getUserInstance(user.id, activeQuestionInstance.question_instance_id)

                    if (uqi) {
                        setUserQuestionInstance(uqi)
                    } else {
                        await putUserInstance({
                            user_question_instance_id: -1,
                            user_id: user.id,
                            question_instance_id: activeQuestionInstance.question_instance_id,
                            points: null,
                            riddle_complete: null,
                            lapse_time: null,
                            attempts: null
                        } as UserQuestionInstance)
                            .then(response => setUserQuestionInstance(response))
                    }
                }

            } catch (error) {
                logFrontend({
                    level: "ERROR",
                    message: `An error occurred when getting/creating a new user question instance. Reason: ${error}`,
                    component: "CodingHooks",
                    url: globalThis.location.href,
                    stack: (error as Error).stack,
                })
            }
        }
        setStartTime(new Date())
        getOrCreateUserQuestionInstance()
    }, [activeQuestionInstance?.question_instance_id, activeQuestionInstance])

    // switches to a grid with 3 columns when the user already submitted something
    useEffect(() => {
        setMostRecentSubGroupClass(`grid grid-cols-${mostRecentSub ? 3 : 2} gap-2`)
    }, [mostRecentSub])


    return {
        startTime, mostRecentSub, setMostRecentSub,
        isQuestionLoading, setIsQuestionLoading,
        isAsyncLoading, setIsAsyncLoading,
        activeQuestion, setActiveQuestion,
        activeQuestionInstance, setActiveQuestionInstance,
        activeDisplayQuestionName, setActiveDisplayQuestionName,
        userQuestionInstance, setUserQuestionInstance,
        questions, questionsInstances,
        languages, prevLangRef, event,
        mostRecentSubGroupClass,
        selectedLang, setSelectedLang,
        userPreferences, testcases,
        loadingMsg, setLoadingMsg
    }
}