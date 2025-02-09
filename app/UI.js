import styled from "styled-components";


export const Card = styled.div`
    border-width: thin;
    padding: 1rem;
    border-radius: 0.75rem;
    border-color: rgb(156 163 175);
    margin-right: 0.75rem;
    margin-bottom: 0.75rem;
    width: 100vw;
    max-width: 20rem;

    @media (min-width: 1000px) {
        padding: 1.5rem;
        width: 100vw;
    }

    &:hover {
        background-color: rgb(229 231 235);
    }
`

